"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { enfileirar } from "@/lib/agenda/sincronizar";
import {
  planejarAtualizacao,
  type AppAtual,
  type LancamentoAtual,
  type Problema,
  type Renome,
} from "@/lib/atualizacao-ameixa";
import type { LinhaCru } from "@/lib/csv";
import type { PlanilhaDoAmeixa } from "@/lib/planilha-ameixa-leitura";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esquema = z.object({
  lancamentos: z
    .array(
      z.object({
        linha: z.number().int(),
        codigo: z.string().max(80),
        cru: z.record(z.string(), z.string().max(5000)),
      }),
    )
    .max(20000),
  categorias: z
    .array(
      z.object({
        linha: z.number().int(),
        codigo: z.string().max(80),
        tipo: z.string().max(40),
        categoria: z.string().max(200),
        subcategoria: z.string().max(200),
      }),
    )
    .max(3000),
  contas: z
    .array(z.object({ linha: z.number().int(), codigo: z.string().max(80), nome: z.string().max(200) }))
    .max(500),
});

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Quantos lançamentos por rodada: cabe folgado no tempo de uma função. */
const POR_RODADA = 200;
const EM_PARALELO = 8;

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

export type ResumoAtualizacao =
  | {
      ok: true;
      renomes: Renome[];
      mudancas: { linha: number; descricao: string; campos: string[] }[];
      novas: number;
      problemas: Problema[];
      semMudanca: number;
    }
  | { ok: false; erro: string };

/** A prévia: o que vai mudar, sem gravar nada. */
export async function analisarAtualizacao(entrada: PlanilhaDoAmeixa): Promise<ResumoAtualizacao> {
  const v = esquema.safeParse(entrada);
  if (!v.success) return { ok: false, erro: "Não consegui entender essa planilha." };

  const supabase = await criarClienteServidor();
  const app = await carregarApp(supabase, v.data.lancamentos.map((l) => l.codigo));
  if (!app) return { ok: false, erro: "Não deu para ler os seus dados agora. Tente de novo." };

  const plano = planejarAtualizacao(v.data, app);
  return {
    ok: true,
    renomes: plano.renomes,
    mudancas: plano.mudancas.map((m) => ({ linha: m.linha, descricao: m.descricao, campos: m.campos })),
    novas: plano.novas.length,
    problemas: plano.problemas,
    semMudanca: plano.semMudanca,
  };
}

export type ResultadoAtualizacao =
  | {
      ok: true;
      renomeados: number;
      atualizados: number;
      restantes: number;
      falhas: string[];
      novas: LinhaCru[];
    }
  | { ok: false; erro: string };

const TABELA = { categoria: "categorias", subcategoria: "subcategorias", conta: "contas" } as const;
const ROTULO = { categoria: "A categoria", subcategoria: "A subcategoria", conta: "A conta" } as const;

/**
 * Aplica uma rodada: todos os nomes e até POR_RODADA lançamentos.
 *
 * O plano é recalculado a cada chamada com o banco na mão — não se confia no
 * que veio do navegador. E como o que já foi gravado deixa de aparecer como
 * mudança, a próxima rodada pega naturalmente os que faltam: rodada que cai
 * no meio não deixa nada pela metade nem aplica nada duas vezes.
 */
export async function aplicarAtualizacao(entrada: PlanilhaDoAmeixa): Promise<ResultadoAtualizacao> {
  const v = esquema.safeParse(entrada);
  if (!v.success) return { ok: false, erro: "Não consegui entender essa planilha." };

  const supabase = await criarClienteServidor();
  const app = await carregarApp(supabase, v.data.lancamentos.map((l) => l.codigo));
  if (!app) return { ok: false, erro: "Não deu para ler os seus dados agora. Tente de novo." };

  const plano = planejarAtualizacao(v.data, app);
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

  if (renomeados || alterados.length) {
    for (const p of ["/", "/extrato", "/recorrentes", "/pendencias", "/relatorios", "/orcamentos", "/categorias", "/cartoes"]) {
      revalidatePath(p);
    }
  }

  return {
    ok: true,
    renomeados,
    atualizados: alterados.length,
    restantes: Math.max(0, plano.mudancas.length - alterados.length),
    falhas,
    novas: plano.novas,
  };
}
