"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import {
  apagarEventoOrfao,
  enfileirar,
  LIMITE_NA_HORA,
  sincronizarLancamentos,
} from "@/lib/agenda/sincronizar";
import { paraIso } from "@/lib/formato";
import { gerarSerie, type ConfigSerie } from "@/lib/serie";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import {
  dataQueVale,
  ROTULO_SITUACAO,
  situacaoAlvo,
  situacoesDoTipo,
  trocarDiaDoMes,
  type Situacao,
  type TipoLancamento,
} from "@/lib/tipos/lancamentos";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const uuidOuVazio = z.string().uuid().nullable().optional();

const esquema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(["despesa", "receita", "aporte"]),
  valor: z.number().positive("O valor precisa ser maior que zero."),
  descricao: z.string().trim().min(1, "Escreva uma descrição.").max(120),
  data_registro: z.string().regex(ISO, "Data inválida."),
  data_vencimento: z.string().regex(ISO).nullable().optional(),
  situacao: z.enum(["pago", "a_pagar", "recebido", "a_receber", "guardado"]),
  categoria_id: uuidOuVazio,
  subcategoria_id: uuidOuVazio,
  conta_id: uuidOuVazio,
  cartao_id: uuidOuVazio,
  forma_pagamento: z.string().trim().max(40).nullable().optional(),
  responsavel: z.string().trim().max(60).nullable().optional(),
  observacao: z.string().trim().max(2000).nullable().optional(),
  meta_id: uuidOuVazio,
  incompleto: z.boolean().optional(),
  repeticao: z.discriminatedUnion("repeticao", [
    z.object({ repeticao: z.literal("unica") }),
    z.object({
      repeticao: z.literal("parcelada"),
      parcelaAtual: z.number().int().min(1).max(999),
      parcelaTotal: z.number().int().min(1).max(999),
    }),
    z.object({
      repeticao: z.literal("recorrente"),
      frequencia: z.enum([
        "semanal",
        "quinzenal",
        "mensal",
        "semestral",
        "anual",
        "personalizado",
      ]),
      intervalo: z.number().int().min(1).max(365).optional(),
      unidade: z.enum(["dias", "semanas", "meses"]).optional(),
      ocorrencias: z.number().int().min(1).max(240),
      ate: z.string().regex(ISO).nullable().optional(),
    }),
    z.object({
      repeticao: z.literal("assinatura"),
      meses: z.number().int().min(1).max(240),
    }),
  ]),
});

export type EntradaLancamento = z.input<typeof esquema>;
export type Resultado =
  | { ok: true; criados: number }
  | { ok: false; erro: string };

export async function salvarLancamento(
  entrada: EntradaLancamento,
): Promise<Resultado> {
  const v = esquema.safeParse(entrada);
  if (!v.success) {
    return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = v.data;

  // Aporte precisa de meta: é o que faz o dinheiro chegar lá.
  if (d.tipo === "aporte" && !d.meta_id) {
    return { ok: false, erro: "Escolha em qual meta você quer guardar." };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const comuns = {
    user_id: user.id,
    tipo: d.tipo,
    valor: d.valor,
    categoria_id: d.tipo === "aporte" ? null : (d.categoria_id ?? null),
    subcategoria_id: d.tipo === "aporte" ? null : (d.subcategoria_id ?? null),
    conta_id: d.conta_id ?? null,
    cartao_id: d.tipo === "aporte" ? null : (d.cartao_id ?? null),
    forma_pagamento: d.tipo === "aporte" ? null : (d.forma_pagamento || null),
    responsavel: d.responsavel || null,
    observacao: d.observacao || null,
    meta_id: d.tipo === "aporte" ? (d.meta_id ?? null) : null,
    incompleto: d.incompleto ?? false,
  };

  // Editar mexe só na ocorrência aberta. Regra 4 do modelo de dados: cada
  // ocorrência da série é um lançamento independente.
  if (d.id) {
    const { error } = await supabase
      .from("lancamentos")
      .update({
        ...comuns,
        descricao: d.descricao,
        data_registro: d.data_registro,
        data_vencimento: d.data_vencimento ?? null,
        situacao: d.situacao,
      })
      .eq("id", d.id);

    if (error) return { ok: false, erro: traduzir(error.message) };
    revalidarTudo();
    // É por aqui que passa "marcar como paga", então é aqui que o evento
    // perde o lembrete. Depois da resposta: a agenda é conveniência, o
    // lançamento é o dado.
    naAgenda([d.id]);
    return { ok: true, criados: 1 };
  }

  const ocorrencias = gerarSerie(
    {
      tipo: d.tipo,
      descricao: d.descricao,
      dataRegistro: d.data_registro,
      dataVencimento: d.data_vencimento ?? null,
      situacao: d.situacao,
    },
    d.repeticao as ConfigSerie,
    paraIso(new Date()),
  );

  const serieId =
    d.repeticao.repeticao === "unica" ? null : globalThis.crypto.randomUUID();

  const { data: criados, error } = await supabase.from("lancamentos").insert(
    ocorrencias.map((o) => ({
      ...comuns,
      descricao: o.descricao,
      data_registro: o.data_registro,
      data_vencimento: o.data_vencimento,
      situacao: o.situacao,
      serie_id: serieId,
      serie_tipo: o.serie_tipo,
      parcela_atual: o.parcela_atual,
      parcela_total: o.parcela_total,
    })),
  ).select("id");

  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidarTudo();
  naAgenda((criados ?? []).map((c) => c.id));
  return { ok: true, criados: ocorrencias.length };
}

/**
 * Manda os lançamentos para o Google Agenda depois que a resposta já foi.
 *
 * Nada daqui pode virar erro na tela: o lançamento já está salvo. Série
 * grande vai direto para a fila em vez de segurar a função por doze idas e
 * voltas ao Google.
 */
function naAgenda(ids: string[]) {
  if (ids.length === 0) return;
  after(async () => {
    if (ids.length > LIMITE_NA_HORA) await enfileirar(ids, "salvar");
    else await sincronizarLancamentos(ids);
  });
}

export async function excluirLancamento(
  id: string,
  serieToda = false,
): Promise<Resultado> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, erro: "Lançamento inválido." };
  }

  const supabase = await criarClienteServidor();

  if (serieToda) {
    const { data } = await supabase
      .from("lancamentos")
      .select("serie_id")
      .eq("id", id)
      .maybeSingle();

    if (data?.serie_id) {
      const orfaos = await eventosDe(supabase, { serie_id: data.serie_id });
      const { error } = await supabase
        .from("lancamentos")
        .delete()
        .eq("serie_id", data.serie_id);
      if (error) return { ok: false, erro: traduzir(error.message) };
      revalidarTudo();
      limparDaAgenda(orfaos);
      return { ok: true, criados: 0 };
    }
  }

  // Ler antes de apagar não é preferência: `eventos_agenda` tem
  // `on delete cascade`, então depois do delete o vínculo já não existe e o
  // evento ficaria órfão na agenda para sempre.
  const orfaos = await eventosDe(supabase, { id });

  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidarTudo();
  limparDaAgenda(orfaos);
  return { ok: true, criados: 0 };
}

type Orfao = { calendario_id: string; evento_id: string };

async function eventosDe(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  filtro: { id?: string; serie_id?: string; ids?: string[] },
): Promise<Orfao[]> {
  const ids = filtro.ids
    ? filtro.ids
    : filtro.serie_id
      ? ((
          await supabase
            .from("lancamentos")
            .select("id")
            .eq("serie_id", filtro.serie_id)
        ).data ?? []).map((l) => l.id)
      : [filtro.id!];

  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("eventos_agenda")
    .select("calendario_id, evento_id")
    .in("lancamento_id", ids);

  return data ?? [];
}

function limparDaAgenda(orfaos: Orfao[]) {
  if (orfaos.length === 0) return;
  after(async () => {
    for (const o of orfaos) await apagarEventoOrfao(o);
  });
}

/** Registro Fácil: grava só o valor e marca como pendência a completar. */
export async function salvarRapido(
  valor: number,
  tipo: "despesa" | "receita",
  contaId: string | null,
): Promise<Resultado> {
  if (!(valor > 0)) return { ok: false, erro: "Digite um valor." };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const hoje = paraIso(new Date());
  const { error } = await supabase.from("lancamentos").insert({
    user_id: user.id,
    tipo,
    valor,
    descricao: tipo === "despesa" ? "Gasto rápido" : "Entrada rápida",
    data_registro: hoje,
    situacao: tipo === "despesa" ? "pago" : "recebido",
    conta_id: contaId,
    incompleto: true,
  });

  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidarTudo();
  return { ok: true, criados: 1 };
}

function revalidarTudo() {
  for (const p of [
    "/",
    "/extrato",
    "/recorrentes",
    "/pendencias",
    "/relatorios",
    "/metas",
    "/orcamentos",
    "/cartoes",
  ]) {
    revalidatePath(p);
  }
}

function traduzir(bruto: string): string {
  const m = bruto.toLowerCase();
  if (m.includes("valor_check") || m.includes("check constraint"))
    return "O valor precisa ser maior que zero.";
  if (m.includes("row-level security")) return "Sessão expirada. Entre de novo.";
  if (m.includes("foreign key"))
    return "Alguma categoria ou conta escolhida não existe mais. Recarregue a tela.";
  if (m.includes("duplicate key")) return "Esse lançamento já foi importado antes.";
  return "Não deu para salvar. Tente novamente.";
}

/** Teto de uma chamada em lote. Acima disso a lista vira duas. */
const MAX_LOTE = 500;

const idsEmLote = z.array(z.string().uuid()).min(1).max(MAX_LOTE);

export type ResultadoLote =
  | {
      ok: true;
      alterados: number;
      /** Aportes e quem já estava no destino. */
      ignorados: number;
      /** Situação anterior de cada alterado, para o Desfazer. */
      antes: { id: string; situacao: Situacao }[];
    }
  | { ok: false; erro: string };

/**
 * Muda a situação de vários lançamentos de uma vez.
 *
 * Existe porque marcar meses de pendências uma a uma pelo formulário é
 * inviável: são dezenas de aberturas de modal, e no meio do caminho é fácil
 * salvar sem querer outro campo junto. Aqui só a situação é tocada.
 *
 * Devolve a situação anterior de cada um para a tela poder oferecer
 * Desfazer — em lote, um clique errado custa caro e não há como reverter
 * pela interface.
 */
export async function marcarSituacaoEmLote(
  ids: string[],
  alvo: "quitado" | "pendente",
): Promise<ResultadoLote> {
  const v = idsEmLote.safeParse(ids);
  if (!v.success) {
    return {
      ok: false,
      erro:
        ids.length > MAX_LOTE
          ? `São ${ids.length} lançamentos de uma vez. O limite é ${MAX_LOTE}.`
          : "Seleção inválida.",
    };
  }

  const supabase = await criarClienteServidor();

  const { data: atuais, error: erroLeitura } = await supabase
    .from("lancamentos")
    .select("id, tipo, situacao")
    .in("id", v.data);

  if (erroLeitura) return { ok: false, erro: traduzir(erroLeitura.message) };

  const antes: { id: string; situacao: Situacao }[] = [];
  const porDestino = new Map<Situacao, string[]>();
  let ignorados = 0;

  for (const l of atuais ?? []) {
    const alvoDele = situacaoAlvo(l.tipo as TipoLancamento, alvo);
    if (!alvoDele || alvoDele === l.situacao) {
      ignorados += 1;
      continue;
    }
    antes.push({ id: l.id as string, situacao: l.situacao as Situacao });
    porDestino.set(alvoDele, [...(porDestino.get(alvoDele) ?? []), l.id as string]);
  }

  if (antes.length === 0) return { ok: true, alterados: 0, ignorados, antes: [] };

  for (const [situacao, lote] of porDestino) {
    const { error } = await supabase
      .from("lancamentos")
      .update({ situacao })
      .in("id", lote);
    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  revalidarTudo();
  // Mesmo motivo de salvarLancamento: quem foi quitado perde o lembrete.
  naAgenda(antes.map((a) => a.id));
  return { ok: true, alterados: antes.length, ignorados, antes };
}

/** Devolve cada lançamento à situação que tinha antes do lote. */
export async function restaurarSituacoes(
  antes: { id: string; situacao: Situacao }[],
): Promise<Resultado> {
  const esquemaAntes = z
    .array(
      z.object({
        id: z.string().uuid(),
        situacao: z.enum(["pago", "a_pagar", "recebido", "a_receber", "guardado"]),
      }),
    )
    .min(1)
    .max(MAX_LOTE);

  const v = esquemaAntes.safeParse(antes);
  if (!v.success) return { ok: false, erro: "Não deu para desfazer." };

  const supabase = await criarClienteServidor();

  const porSituacao = new Map<Situacao, string[]>();
  for (const a of v.data) {
    porSituacao.set(a.situacao, [...(porSituacao.get(a.situacao) ?? []), a.id]);
  }

  for (const [situacao, lote] of porSituacao) {
    const { error } = await supabase
      .from("lancamentos")
      .update({ situacao })
      .in("id", lote);
    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  revalidarTudo();
  naAgenda(v.data.map((a) => a.id));
  return { ok: true, criados: v.data.length };
}

export type ResultadoVencimento =
  | {
      ok: true;
      alterados: number;
      ignorados: number;
      antes: { id: string; data_vencimento: string | null }[];
    }
  | { ok: false; erro: string };

/**
 * Põe o vencimento de vários lançamentos no mesmo dia do mês, mantendo o
 * mês de cada um.
 *
 * Existe para consertar séries geradas antes da correção do gerador, que
 * faziam o vencimento escorregar (10, 11, 10, 10, 11...). Quem não tinha
 * vencimento passa a ter, no mês da própria data de registro.
 */
export async function mudarDiaDoVencimentoEmLote(
  ids: string[],
  dia: number,
): Promise<ResultadoVencimento> {
  const v = idsEmLote.safeParse(ids);
  if (!v.success) {
    return {
      ok: false,
      erro:
        ids.length > MAX_LOTE
          ? `São ${ids.length} lançamentos de uma vez. O limite é ${MAX_LOTE}.`
          : "Seleção inválida.",
    };
  }
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    return { ok: false, erro: "Escolha um dia entre 1 e 31." };
  }

  const supabase = await criarClienteServidor();
  const { data: atuais, error: erroLeitura } = await supabase
    .from("lancamentos")
    .select("id, data_registro, data_vencimento")
    .in("id", v.data);
  if (erroLeitura) return { ok: false, erro: traduzir(erroLeitura.message) };

  const antes: { id: string; data_vencimento: string | null }[] = [];
  const porData = new Map<string, string[]>();
  let ignorados = 0;

  for (const l of atuais ?? []) {
    const atual = (l.data_vencimento as string | null) ?? null;
    const novo = trocarDiaDoMes(
      dataQueVale({ data_vencimento: atual, data_registro: l.data_registro as string }),
      dia,
    );
    if (atual?.slice(0, 10) === novo) {
      ignorados += 1;
      continue;
    }
    antes.push({ id: l.id as string, data_vencimento: atual });
    porData.set(novo, [...(porData.get(novo) ?? []), l.id as string]);
  }

  if (antes.length === 0) return { ok: true, alterados: 0, ignorados, antes: [] };

  for (const [data, lote] of porData) {
    const { error } = await supabase
      .from("lancamentos")
      .update({ data_vencimento: data })
      .in("id", lote);
    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  revalidarTudo();
  // Data nova, lembrete novo: o evento na agenda muda de dia junto.
  naAgenda(antes.map((a) => a.id));
  return { ok: true, alterados: antes.length, ignorados, antes };
}

/** Devolve cada lançamento ao vencimento que tinha antes do lote. */
export async function restaurarVencimentos(
  antes: { id: string; data_vencimento: string | null }[],
): Promise<Resultado> {
  const v = z
    .array(
      z.object({
        id: z.string().uuid(),
        data_vencimento: z.string().regex(ISO).nullable(),
      }),
    )
    .min(1)
    .max(MAX_LOTE)
    .safeParse(antes.map((a) => ({ ...a, data_vencimento: a.data_vencimento?.slice(0, 10) ?? null })));
  if (!v.success) return { ok: false, erro: "Não deu para desfazer." };

  const supabase = await criarClienteServidor();

  // `null` é um grupo como outro qualquer: quem não tinha vencimento volta
  // a não ter.
  const porData = new Map<string | null, string[]>();
  for (const a of v.data) {
    porData.set(a.data_vencimento, [...(porData.get(a.data_vencimento) ?? []), a.id]);
  }

  for (const [data, lote] of porData) {
    const { error } = await supabase
      .from("lancamentos")
      .update({ data_vencimento: data })
      .in("id", lote);
    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  revalidarTudo();
  naAgenda(v.data.map((a) => a.id));
  return { ok: true, criados: v.data.length };
}

const itemEdicao = z.object({
  id: z.string().uuid(),
  descricao: z.string().trim().min(1, "Toda linha precisa de uma descrição.").max(120),
  valor: z
    .number()
    .positive("O valor precisa ser maior que zero.")
    .max(1_000_000_000, "Valor alto demais."),
  data_vencimento: z.string().regex(ISO, "Data inválida.").nullable(),
  // Opcionais: a lista de séries só mexe nos campos acima; a tela da série
  // completa também corrige a data de registro e a situação.
  data_registro: z.string().regex(ISO, "Data de registro inválida.").optional(),
  situacao: z.enum(["pago", "a_pagar", "recebido", "a_receber", "guardado"]).optional(),
});

export type ItemEdicao = z.infer<typeof itemEdicao>;

export type ResultadoEdicao =
  | { ok: true; alterados: number; antes: ItemEdicao[] }
  | { ok: false; erro: string; antes: ItemEdicao[] };

/** Quantas linhas vão ao banco ao mesmo tempo. */
const EM_PARALELO = 8;

/**
 * Grava várias linhas de uma vez: descrição, valor e vencimento sempre, e
 * data de registro e situação quando vierem.
 *
 * Cada linha pode ter valores diferentes (o mês de cada vencimento é
 * outro), então não dá para um único `update ... in (...)`. As linhas vão
 * em grupos pequenos em paralelo.
 *
 * Só linhas que mudaram de fato são gravadas. O que elas tinham antes volta
 * na resposta, com todos os campos: desfazer é chamar esta mesma função com
 * esses valores. Se algo falhar no meio, a resposta traz o `antes` do que já
 * foi gravado, para o Desfazer ainda funcionar.
 */
export async function editarLancamentosEmLote(
  itens: ItemEdicao[],
): Promise<ResultadoEdicao> {
  const v = z.array(itemEdicao).min(1).max(MAX_LOTE).safeParse(itens);
  if (!v.success) {
    return {
      ok: false,
      erro: v.error.issues[0]?.message ?? "Dados inválidos.",
      antes: [],
    };
  }

  const supabase = await criarClienteServidor();
  const { data: atuais, error: erroLeitura } = await supabase
    .from("lancamentos")
    .select("id, tipo, descricao, valor, data_registro, data_vencimento, situacao")
    .in(
      "id",
      v.data.map((i) => i.id),
    );
  if (erroLeitura) {
    return { ok: false, erro: traduzir(erroLeitura.message), antes: [] };
  }

  type Atual = {
    id: string;
    tipo: TipoLancamento;
    descricao: string;
    valor: number;
    data_registro: string;
    data_vencimento: string | null;
    situacao: Situacao;
  };

  const porId = new Map<string, Atual>(
    (atuais ?? []).map((a) => [
      a.id as string,
      {
        id: a.id as string,
        tipo: a.tipo as TipoLancamento,
        descricao: a.descricao as string,
        valor: Number(a.valor),
        data_registro: String(a.data_registro).slice(0, 10),
        data_vencimento: ((a.data_vencimento as string | null) ?? null)?.slice(0, 10) ?? null,
        situacao: a.situacao as Situacao,
      },
    ]),
  );

  // Despesa não pode virar "recebido", nem receita "pago": a situação tem que
  // existir para o tipo, senão os relatórios contam o dinheiro do lado errado.
  for (const i of v.data) {
    const a = porId.get(i.id);
    if (a && i.situacao && !situacoesDoTipo(a.tipo).includes(i.situacao)) {
      return {
        ok: false,
        erro: `"${i.descricao}" não pode ficar como ${ROTULO_SITUACAO[i.situacao]}.`,
        antes: [],
      };
    }
  }

  const paraAntes = (a: Atual): ItemEdicao => ({
    id: a.id,
    descricao: a.descricao,
    valor: a.valor,
    data_vencimento: a.data_vencimento,
    data_registro: a.data_registro,
    situacao: a.situacao,
  });

  const mudar = v.data.filter((i) => {
    const a = porId.get(i.id);
    return (
      !!a &&
      (a.descricao !== i.descricao ||
        a.valor !== i.valor ||
        a.data_vencimento !== i.data_vencimento ||
        (i.data_registro !== undefined && a.data_registro !== i.data_registro) ||
        (i.situacao !== undefined && a.situacao !== i.situacao))
    );
  });

  const antes: ItemEdicao[] = [];
  for (let k = 0; k < mudar.length; k += EM_PARALELO) {
    const grupo = mudar.slice(k, k + EM_PARALELO);
    const respostas = await Promise.all(
      grupo.map((i) =>
        supabase
          .from("lancamentos")
          .update({
            descricao: i.descricao,
            valor: i.valor,
            data_vencimento: i.data_vencimento,
            ...(i.data_registro ? { data_registro: i.data_registro } : {}),
            ...(i.situacao ? { situacao: i.situacao } : {}),
          })
          .eq("id", i.id),
      ),
    );
    respostas.forEach((r, x) => {
      if (!r.error) antes.push(paraAntes(porId.get(grupo[x].id)!));
    });
    const falha = respostas.find((r) => r.error);
    if (falha?.error) {
      if (antes.length) {
        revalidarTudo();
        naAgenda(antes.map((a) => a.id));
      }
      return {
        ok: false,
        erro: `${antes.length} de ${mudar.length} gravados; o resto falhou: ${traduzir(falha.error.message)}`,
        antes,
      };
    }
  }

  if (antes.length) {
    revalidarTudo();
    naAgenda(antes.map((a) => a.id));
  }
  return { ok: true, alterados: antes.length, antes };
}

export type ResultadoExclusao =
  | { ok: true; excluidos: number; ignorados: number }
  | { ok: false; erro: string };

/**
 * Apaga pendências de uma vez — o caso é a série cadastrada duas vezes.
 *
 * Só apaga o que está a pagar ou a receber. O que já foi pago é histórico:
 * mesmo que venha na lista, fica, e a resposta conta quantos ficaram.
 */
export async function excluirPendentesEmLote(
  ids: string[],
): Promise<ResultadoExclusao> {
  const v = idsEmLote.safeParse(ids);
  if (!v.success) return { ok: false, erro: "Seleção inválida." };

  const supabase = await criarClienteServidor();
  const { data: atuais, error: erroLeitura } = await supabase
    .from("lancamentos")
    .select("id, situacao")
    .in("id", v.data);
  if (erroLeitura) return { ok: false, erro: traduzir(erroLeitura.message) };

  const pendentes = (atuais ?? [])
    .filter((l) => l.situacao === "a_pagar" || l.situacao === "a_receber")
    .map((l) => l.id as string);
  const ignorados = v.data.length - pendentes.length;
  if (pendentes.length === 0) return { ok: true, excluidos: 0, ignorados };

  // Mesmo motivo de excluirLancamento: depois do delete o vínculo com a
  // agenda some em cascata, e o evento ficaria órfão.
  const orfaos = await eventosDe(supabase, { ids: pendentes });

  const { error } = await supabase.from("lancamentos").delete().in("id", pendentes);
  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidarTudo();
  limparDaAgenda(orfaos);
  return { ok: true, excluidos: pendentes.length, ignorados };
}

/**
 * Apaga os lançamentos escolhidos, pagos ou não.
 *
 * Diferente de excluirPendentesEmLote: na tela da série completa o dono
 * escolhe linha a linha, vê quantas já estavam pagas e confirma. Os eventos
 * da agenda são lidos antes do delete, pelo mesmo motivo de
 * excluirLancamento.
 */
export async function excluirLancamentosEmLote(ids: string[]): Promise<ResultadoExclusao> {
  const v = idsEmLote.safeParse(ids);
  if (!v.success) return { ok: false, erro: "Seleção inválida." };

  const supabase = await criarClienteServidor();
  const orfaos = await eventosDe(supabase, { ids: v.data });

  const { data, error } = await supabase
    .from("lancamentos")
    .delete()
    .in("id", v.data)
    .select("id");
  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidarTudo();
  limparDaAgenda(orfaos);
  const excluidos = data?.length ?? 0;
  return { ok: true, excluidos, ignorados: v.data.length - excluidos };
}
