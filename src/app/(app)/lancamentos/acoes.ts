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
  filtro: { id?: string; serie_id?: string },
): Promise<Orfao[]> {
  const ids = filtro.serie_id
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
