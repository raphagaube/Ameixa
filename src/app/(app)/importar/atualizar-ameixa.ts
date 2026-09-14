"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { excluirLancamentosEmLote } from "@/app/(app)/lancamentos/acoes";
import { enfileirar } from "@/lib/agenda/sincronizar";
import {
  casarNovas,
  periodoDaPlanilha,
  planejarAtualizacao,
  type AppAtual,
  type LancamentoAtual,
  type LancamentoParaCasar,
  type Nova,
  type Problema,
  type Renome,
} from "@/lib/atualizacao-ameixa";
import type { PlanilhaDoAmeixa } from "@/lib/planilha-ameixa-leitura";
import { expandirPlanilha, type PlanilhaCompacta } from "@/lib/planilha-compacta";
import { criarClienteServidor, usuarioAtual } from "@/lib/supabase/servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esquema = z.object({
  colunas: z.array(z.string().max(80)).max(60),
  lancamentos: z
    .array(z.tuple([z.number().int(), z.string().max(80), z.array(z.string().max(5000)).max(60)]))
    .max(20000),
  categorias: z
    .array(
      z.tuple([
        z.number().int(),
        z.string().max(80),
        z.string().max(40),
        z.string().max(200),
        z.string().max(200),
      ]),
    )
    .max(3000),
  contas: z.array(z.tuple([z.number().int(), z.string().max(80), z.string().max(200)])).max(500),
});

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Quantos lançamentos por rodada: cabe folgado no tempo de uma função. */
const POR_RODADA = 200;
const EM_PARALELO = 8;

function ler(entrada: PlanilhaCompacta): PlanilhaDoAmeixa | null {
  const v = esquema.safeParse(entrada);
  return v.success ? expandirPlanilha(v.data as PlanilhaCompacta) : null;
}

/**
 * Lê do banco o que a planilha cita. Pedaços de 150 códigos por consulta:
 * a lista vai na URL, e mil códigos juntos passam do tamanho que ela aceita.
 */
async function carregarApp(supabase: Cliente, codigos: string[]): Promise<AppAtual | null> {
  const [cats, contas] = await Promise.all([
    supabase.from("categorias").select("id, nome, tipo, subcategorias(id, nome)"),
    supabase.from("contas").select("id, nome"),
  ]);
  if (cats.error || contas.error) return null;

  const ids = [...new Set(codigos.filter((c) => UUID.test(c)))];
  const lancamentos = new Map<string, LancamentoAtual>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase
      .from("lancamentos")
      .select(
        "id, tipo, valor, descricao, data_registro, data_vencimento, situacao, categoria_id, subcategoria_id, conta_id, forma_pagamento, responsavel, observacao",
      )
      .in("id", ids.slice(i, i + 150));
    if (error) return null;
    for (const l of (data ?? []) as Record<string, unknown>[]) {
      lancamentos.set(l.id as string, { ...(l as unknown as LancamentoAtual), valor: Number(l.valor) });
    }
  }

  type CatBruta = {
    id: string;
    nome: string;
    tipo: "despesa" | "receita";
    subcategorias: { id: string; nome: string }[] | null;
  };

  return {
    categorias: ((cats.data ?? []) as unknown as CatBruta[]).map((c) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      subcategorias: (Array.isArray(c.subcategorias) ? c.subcategorias : []).map((s) => ({
        id: s.id,
        nome: s.nome,
      })),
    })),
    contas: ((contas.data ?? []) as { id: string; nome: string }[]).map((c) => ({
      id: c.id,
      nome: c.nome,
    })),
    lancamentos,
  };
}

/**
 * Confere as linhas novas contra o app: as que já entraram numa aplicação
 * anterior da mesma planilha não são criadas de novo (ver `casarNovas`).
 */
async function casarNovasComApp(
  supabase: Cliente,
  planilha: PlanilhaDoAmeixa,
  novas: Nova[],
): Promise<{ aCriar: Nova[]; jaNoApp: string[] } | null> {
  if (novas.length === 0) return { aCriar: [], jaNoApp: [] };

  const datas = novas.map((n) => n.novos.data_registro).sort();
  const existentes: LancamentoParaCasar[] = [];
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabase
      .from("lancamentos")
      .select("id, tipo, valor, descricao, data_registro")
      .gte("data_registro", datas[0])
      .lte("data_registro", datas[datas.length - 1])
      .neq("tipo", "aporte")
      .order("id", { ascending: true })
      .range(inicio, inicio + 999);
    if (error || !data) return null;
    for (const l of data as { id: string; tipo: string; valor: unknown; descricao: string; data_registro: string }[]) {
      existentes.push({ ...l, valor: Number(l.valor) });
    }
    if (data.length < 1000) break;
  }

  const codigos = new Set(planilha.lancamentos.map((l) => l.codigo).filter(Boolean));
  return casarNovas(novas, existentes, codigos);
}

type ItemLista = { id: string; descricao: string; data: string; valor: number; tipo: string };

/**
 * O que está no app dentro do período da planilha e não está nela.
 *
 * O período vem só das linhas com código (ver `periodoDaPlanilha`). Aportes
 * em meta ficam de fora sempre: eles nunca vão para a planilha, e sem esta
 * trava todos os aportes do período seriam apagados. Planilha sem nenhuma
 * linha com código não tem período, e aí nada é excluído. `manter` são os
 * lançamentos que correspondem a linhas novas da planilha — eles estão nela,
 * só que sem código.
 */
async function exclusoesNoPeriodo(
  supabase: Cliente,
  planilha: PlanilhaDoAmeixa,
  manter: Set<string>,
): Promise<{ de: string | null; ate: string | null; itens: ItemLista[] } | null> {
  const { de, ate } = periodoDaPlanilha(planilha);
  if (!de || !ate) return { de: null, ate: null, itens: [] };

  const naPlanilha = new Set(planilha.lancamentos.map((l) => l.codigo).filter(Boolean));
  const itens: ItemLista[] = [];

  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabase
      .from("lancamentos")
      .select("id, descricao, valor, data_registro, tipo")
      .gte("data_registro", de)
      .lte("data_registro", ate)
      .neq("tipo", "aporte")
      .order("data_registro", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, inicio + 999);
    if (error || !data) return null;
    for (const l of data as { id: string; descricao: string; valor: unknown; data_registro: string; tipo: string }[]) {
      if (!naPlanilha.has(l.id) && !manter.has(l.id)) {
        itens.push({
          id: l.id,
          descricao: l.descricao,
          data: String(l.data_registro).slice(0, 10),
          valor: Number(l.valor),
          tipo: l.tipo,
        });
      }
    }
    if (data.length < 1000) break;
  }

  return { de, ate, itens };
}

/** Grava as linhas novas, em blocos, e manda as pendentes para a agenda. */
async function criarNovas(supabase: Cliente, novas: Nova[]): Promise<{ criados: number; falhas: string[] }> {
  const user = await usuarioAtual();
  if (!user) return { criados: 0, falhas: ["Sessão expirada: as linhas novas não foram criadas. Entre de novo."] };

  let criados = 0;
  const falhas: string[] = [];
  for (let k = 0; k < novas.length; k += 400) {
    const bloco = novas.slice(k, k + 400);
    const { data, error } = await supabase
      .from("lancamentos")
      .insert(
        bloco.map((n) => ({
          ...n.novos,
          user_id: user.id,
          importado: true,
          // Como na importação comum: sem categoria, vira pendência para completar.
          incompleto: !n.novos.categoria_id,
        })),
      )
      .select("id, situacao");
    if (error) {
      falhas.push(
        bloco.length === 1
          ? `A linha ${bloco[0].linha} (${bloco[0].descricao}) não foi criada.`
          : `${bloco.length} linhas novas, a partir da linha ${bloco[0].linha}, não foram criadas.`,
      );
      continue;
    }
    criados += bloco.length;
    await enfileirar(
      ((data ?? []) as { id: string; situacao: string }[])
        .filter((l) => l.situacao === "a_pagar" || l.situacao === "a_receber")
        .map((l) => l.id),
      "salvar",
    );
  }
  return { criados, falhas };
}

const paraLista = ({ descricao, data, valor, tipo }: ItemLista) => ({ descricao, data, valor, tipo });

export type ResumoAtualizacao =
  | {
      ok: true;
      renomes: Renome[];
      mudancas: { linha: number; descricao: string; campos: string[] }[];
      problemas: Problema[];
      semMudanca: number;
      /** Linhas sem código que viram lançamentos novos. */
      entradas: {
        quantidade: number;
        /** Linhas sem código que já estão no app, iguais, e não entram de novo. */
        jaNoApp: number;
        itens: Omit<ItemLista, "id">[];
      };
      exclusoes: {
        de: string | null;
        ate: string | null;
        quantidade: number;
        itens: Omit<ItemLista, "id">[];
      };
    }
  | { ok: false; erro: string };

/** A prévia: o que vai mudar, entrar e sair, sem gravar nada. */
export async function analisarAtualizacao(entrada: PlanilhaCompacta): Promise<ResumoAtualizacao> {
  const planilha = ler(entrada);
  if (!planilha) return { ok: false, erro: "Não consegui entender essa planilha." };

  const falhaDeLeitura = { ok: false as const, erro: "Não deu para ler os seus dados agora. Tente de novo." };
  const supabase = await criarClienteServidor();
  const app = await carregarApp(supabase, planilha.lancamentos.map((l) => l.codigo));
  if (!app) return falhaDeLeitura;

  const plano = planejarAtualizacao(planilha, app);
  const casadas = await casarNovasComApp(supabase, planilha, plano.novas);
  if (!casadas) return falhaDeLeitura;
  const exclusoes = await exclusoesNoPeriodo(supabase, planilha, new Set(casadas.jaNoApp));
  if (!exclusoes) return falhaDeLeitura;

  return {
    ok: true,
    renomes: plano.renomes,
    mudancas: plano.mudancas.map((m) => ({ linha: m.linha, descricao: m.descricao, campos: m.campos })),
    problemas: plano.problemas,
    semMudanca: plano.semMudanca,
    entradas: {
      quantidade: casadas.aCriar.length,
      jaNoApp: casadas.jaNoApp.length,
      itens: casadas.aCriar.slice(0, 500).map((n) =>
        paraLista({
          id: "",
          descricao: n.novos.descricao,
          data: n.novos.data_registro,
          valor: n.novos.valor,
          tipo: n.novos.tipo,
        }),
      ),
    },
    exclusoes: {
      de: exclusoes.de,
      ate: exclusoes.ate,
      quantidade: exclusoes.itens.length,
      itens: exclusoes.itens.slice(0, 500).map(paraLista),
    },
  };
}

export type ResultadoAtualizacao =
  | {
      ok: true;
      renomeados: number;
      atualizados: number;
      restantes: number;
      excluidos: number;
      criados: number;
      falhas: string[];
    }
  | { ok: false; erro: string };

const TABELA = { categoria: "categorias", subcategoria: "subcategorias", conta: "contas" } as const;
const ROTULO = { categoria: "A categoria", subcategoria: "A subcategoria", conta: "A conta" } as const;

/**
 * Aplica uma rodada: todos os nomes e até POR_RODADA lançamentos. Na rodada
 * em que não sobra mais nada para atualizar, exclui o que está no período e
 * não está na planilha (só com `excluir` ligado) e cria as linhas novas.
 *
 * O plano, as exclusões e as linhas novas são recalculados a cada chamada com
 * o banco na mão: não se confia no que veio do navegador. O que já foi gravado
 * deixa de aparecer como mudança — e linha nova já criada casa com o
 * lançamento que ela gerou —, então rodada que cai no meio não deixa nada pela
 * metade nem aplica nada duas vezes.
 */
export async function aplicarAtualizacao(
  entrada: PlanilhaCompacta,
  excluir: boolean,
): Promise<ResultadoAtualizacao> {
  const planilha = ler(entrada);
  if (!planilha) return { ok: false, erro: "Não consegui entender essa planilha." };

  const supabase = await criarClienteServidor();
  const app = await carregarApp(supabase, planilha.lancamentos.map((l) => l.codigo));
  if (!app) return { ok: false, erro: "Não deu para ler os seus dados agora. Tente de novo." };

  const plano = planejarAtualizacao(planilha, app);
  const falhas: string[] = [];

  // Nomes primeiro: os lançamentos da rodada já foram casados contra eles.
  let renomeados = 0;
  const renomeadosPorAlvo: Record<Renome["alvo"], string[]> = { categoria: [], subcategoria: [], conta: [] };
  for (const r of plano.renomes) {
    const { error } = await supabase.from(TABELA[r.alvo]).update({ nome: r.para }).eq("id", r.id);
    if (error) {
      falhas.push(
        `${ROTULO[r.alvo]} "${r.de}" não virou "${r.para}"${/duplicate|unique/i.test(error.message) ? ": já existe outra com esse nome" : ""}.`,
      );
    } else {
      renomeados += 1;
      renomeadosPorAlvo[r.alvo].push(r.id);
    }
  }

  const lote = plano.mudancas.slice(0, POR_RODADA);
  const alterados: string[] = [];
  for (let k = 0; k < lote.length; k += EM_PARALELO) {
    const grupo = lote.slice(k, k + EM_PARALELO);
    const respostas = await Promise.all(
      grupo.map((m) => supabase.from("lancamentos").update(m.novos).eq("id", m.id)),
    );
    respostas.forEach((r, i) => {
      if (r.error) falhas.push(`Linha ${grupo[i].linha} (${grupo[i].descricao}) não foi atualizada.`);
      else alterados.push(grupo[i].id);
    });
  }

  // O nome de categoria e de conta aparece na descrição do compromisso: as
  // contas pendentes dos itens renomeados também precisam ir para a agenda.
  const filtros = [
    renomeadosPorAlvo.categoria.length ? `categoria_id.in.(${renomeadosPorAlvo.categoria.join(",")})` : null,
    renomeadosPorAlvo.subcategoria.length
      ? `subcategoria_id.in.(${renomeadosPorAlvo.subcategoria.join(",")})`
      : null,
    renomeadosPorAlvo.conta.length ? `conta_id.in.(${renomeadosPorAlvo.conta.join(",")})` : null,
  ].filter(Boolean);
  let paraAgenda = alterados;
  if (filtros.length) {
    const { data } = await supabase
      .from("lancamentos")
      .select("id")
      .in("situacao", ["a_pagar", "a_receber"])
      .or(filtros.join(","));
    paraAgenda = [...new Set([...alterados, ...((data ?? []) as { id: string }[]).map((d) => d.id)])];
  }
  await enfileirar(paraAgenda, "salvar");

  const restantes = Math.max(0, plano.mudancas.length - alterados.length);

  // Exclusão e linhas novas só no fim, depois de todas as atualizações, e
  // recalculadas agora. Excluir vem antes de criar: o que acabou de ser
  // criado não tem código na planilha e não pode cair na exclusão. A exclusão
  // em si passa pela mesma ação das telas, que limpa a agenda.
  let excluidos = 0;
  let criados = 0;
  if (restantes === 0) {
    const casadas = await casarNovasComApp(supabase, planilha, plano.novas);
    if (!casadas) {
      falhas.push("Não deu para conferir as linhas novas com o app; nada foi excluído nem criado.");
    } else {
      if (excluir) {
        const ex = await exclusoesNoPeriodo(supabase, planilha, new Set(casadas.jaNoApp));
        if (!ex) {
          falhas.push("Não deu para conferir o que excluir; nada foi excluído.");
        } else {
          const ids = ex.itens.map((i) => i.id);
          for (let k = 0; k < ids.length; k += 500) {
            const r = await excluirLancamentosEmLote(ids.slice(k, k + 500));
            if (r.ok) {
              excluidos += r.excluidos;
            } else {
              falhas.push(`Parei de excluir no meio: ${r.erro}`);
              break;
            }
          }
        }
      }

      if (casadas.aCriar.length > 0) {
        const r = await criarNovas(supabase, casadas.aCriar);
        criados = r.criados;
        falhas.push(...r.falhas);
      }
    }
  }

  if (renomeados || alterados.length || excluidos || criados) {
    for (const p of ["/", "/extrato", "/recorrentes", "/pendencias", "/relatorios", "/orcamentos", "/categorias", "/cartoes"]) {
      revalidatePath(p);
    }
  }

  return {
    ok: true,
    renomeados,
    atualizados: alterados.length,
    restantes,
    excluidos,
    criados,
    falhas,
  };
}
