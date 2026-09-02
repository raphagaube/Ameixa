"use server";

import { revalidatePath } from "next/cache";
import { obterCredenciais } from "@/lib/agenda/credenciais";
import { desconectar } from "@/lib/agenda/credenciais";
import {
  drenarFila,
  garantirAgendas,
  sincronizarLancamentos,
} from "@/lib/agenda/sincronizar";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoAgenda =
  | { ok: true; enviados: number; restantes: number }
  | { ok: false; erro: string };

/** Quantas pendências por chamada. O laço fica no cliente, não no servidor. */
const POR_VEZ = 60;

const RECADO: Record<string, string> = {
  "nao-configurado": "A conexão com o Google ainda não foi configurada neste app.",
  "nao-conectado": "Conecte sua conta do Google primeiro.",
  reconectar: "A conexão com o Google expirou. Reconecte para continuar.",
  indisponivel: "O Google não respondeu agora. Tente de novo em instantes.",
};

/**
 * Manda para a agenda as pendências que ainda não têm compromisso.
 *
 * Paginado de propósito: o laço vive no cliente, que mostra "enviei 300 de
 * 640". Um laço no servidor esbarraria no tempo máximo da função da Vercel
 * e perderia tudo que já tinha feito.
 *
 * @param sóFuturas restringe às que ainda vão vencer.
 */
export async function sincronizarPendencias(
  soFuturas = false,
): Promise<ResultadoAgenda> {
  const cred = await obterCredenciais();
  if (typeof cred === "string") {
    return { ok: false, erro: RECADO[cred] ?? RECADO.indisponivel };
  }

  const supabase = await criarClienteServidor();

  // Se as agendas sumiram do Google, recriar antes é o que evita gravar
  // seiscentos eventos em lugar nenhum.
  if (!cred.pagar || !cred.receber) {
    const agendas = await garantirAgendas(cred.access, {
      pagar: cred.pagar,
      receber: cred.receber,
    });
    if (!agendas) {
      return { ok: false, erro: "Não deu para criar as agendas no Google." };
    }
  }

  let q = supabase
    .from("lancamentos")
    .select("id, eventos_agenda(lancamento_id)")
    .in("situacao", ["a_pagar", "a_receber"])
    .order("data_vencimento", { ascending: true, nullsFirst: false });

  if (soFuturas) {
    q = q.gte("data_vencimento", new Date().toISOString().slice(0, 10));
  }

  const { data, error } = await q.limit(3000);
  if (error) return { ok: false, erro: "Não deu para ler suas pendências." };

  const semEvento = (data ?? [])
    .filter((l) => {
      const v = (l as { eventos_agenda?: unknown }).eventos_agenda;
      return Array.isArray(v) ? v.length === 0 : !v;
    })
    .map((l) => l.id as string);

  if (semEvento.length === 0) {
    revalidatePath("/ajustes");
    return { ok: true, enviados: 0, restantes: 0 };
  }

  const lote = semEvento.slice(0, POR_VEZ);
  const r = await sincronizarLancamentos(lote);

  revalidatePath("/ajustes");
  return {
    ok: true,
    enviados: r.feitos,
    // O que falhou continua contando como restante: some da fila do
    // usuário só quando de fato virou compromisso.
    restantes: Math.max(0, semEvento.length - r.feitos),
  };
}

/** Botão "tentar agora" quando algo ficou preso na fila. */
export async function tentarFilaAgora(): Promise<ResultadoAgenda> {
  const r = await drenarFila(60);
  revalidatePath("/ajustes");
  return { ok: true, enviados: r.feitos, restantes: r.adiados };
}

/**
 * Desliga a conexão: revoga o acesso no Google e esquece os vínculos.
 *
 * As duas agendas continuam existindo com os compromissos dentro. Apagar
 * dados que o dono vê não é o que um botão "Desconectar" deveria fazer por
 * conta própria — a tela explica que ele pode apagá-las no Google.
 */
export async function desconectarAgenda(): Promise<
  { ok: true } | { ok: false; erro: string }
> {
  const ok = await desconectar();
  revalidatePath("/ajustes");
  return ok ? { ok: true } : { ok: false, erro: "Não deu para desconectar." };
}
