"use server";

import { revalidatePath } from "next/cache";
import {
  desconectar,
  gravarAgendas,
  obterCredenciais,
} from "@/lib/agenda/credenciais";
import {
  drenarFila,
  garantirAgendas,
  sincronizarLancamentos,
} from "@/lib/agenda/sincronizar";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoAgenda =
  | { ok: true; enviados: number; restantes: number; proximo: number }
  | { ok: false; erro: string };

/**
 * Quantas pendências por chamada.
 *
 * Baixo de propósito: cada uma é uma ida ao Google, em série, e a função da
 * Vercel tem poucos segundos para responder. Lote grande estoura o tempo e
 * perde o que já tinha feito; o laço no cliente compensa com mais rodadas,
 * que custam quase nada.
 */
const POR_VEZ = 15;

const RECADO: Record<string, string> = {
  "nao-configurado": "A conexão com o Google ainda não foi configurada neste app.",
  "nao-conectado": "Conecte sua conta do Google primeiro.",
  reconectar: "A conexão com o Google expirou. Reconecte para continuar.",
  indisponivel: "O Google não respondeu agora. Tente de novo em instantes.",
};

/**
 * Manda pendências para a agenda.
 *
 * Dois modos. O normal pega só o que ainda não tem compromisso — é a carga
 * inicial. O de reconferência passa por **todas** as pendências, inclusive
 * as que já têm evento, e reescreve as que saíram do lugar; serve para
 * quando os dados mudaram por fora do app (uma correção em massa de datas,
 * por exemplo) e a agenda ficou defasada.
 *
 * Reconferir é barato: a assinatura guardada em `eventos_agenda` faz o que
 * não mudou nem virar requisição ao Google.
 *
 * Paginado de propósito: o laço vive no cliente, que mostra o progresso. Um
 * laço no servidor esbarraria no tempo máximo da função da Vercel e perderia
 * tudo que já tinha feito.
 */
export async function sincronizarPendencias(
  reconferir = false,
  desde = 0,
): Promise<ResultadoAgenda> {
  const cred = await obterCredenciais();
  if (typeof cred === "string") {
    return { ok: false, erro: RECADO[cred] ?? RECADO.indisponivel };
  }

  const supabase = await criarClienteServidor();

  // Confere as agendas no começo da série, em vez de confiar no id guardado:
  // se o dono apagou uma delas no Google, sem isto o app tentaria gravar num
  // calendário que não existe mais e ficaria travado nisso. Só na primeira
  // rodada — repetir a cada lote seriam duas requisições jogadas fora por
  // rodada, e a agenda não some no meio de uma série.
  if (desde === 0 || !cred.pagar || !cred.receber) {
    const agendas = await garantirAgendas(cred.access, {
      pagar: cred.pagar,
      receber: cred.receber,
    });
    if (!agendas) {
      return { ok: false, erro: "Não deu para criar as agendas no Google." };
    }
    if (agendas.pagar !== cred.pagar || agendas.receber !== cred.receber) {
      await gravarAgendas(agendas.pagar, agendas.receber);
    }
  }

  const { data, error } = await supabase
    .from("lancamentos")
    .select("id, eventos_agenda(lancamento_id)")
    .in("situacao", ["a_pagar", "a_receber"])
    .order("data_vencimento", { ascending: true, nullsFirst: false })
    .limit(3000);

  if (error) return { ok: false, erro: "Não deu para ler suas pendências." };

  const semEvento = (l: { eventos_agenda?: unknown }) => {
    const v = l.eventos_agenda;
    return Array.isArray(v) ? v.length === 0 : !v;
  };

  const alvos = (data ?? [])
    .filter((l) => reconferir || semEvento(l))
    .map((l) => l.id as string);

  const lote = alvos.slice(desde, desde + POR_VEZ);

  if (lote.length === 0) {
    revalidatePath("/ajustes");
    return { ok: true, enviados: 0, restantes: 0, proximo: 0 };
  }

  const r = await sincronizarLancamentos(lote);
  revalidatePath("/ajustes");

  // Na reconferência o alvo não some da lista depois de tratado, então quem
  // controla o avanço é o deslocamento. Na carga inicial, o próprio filtro
  // encolhe a cada rodada.
  const proximo = reconferir ? desde + lote.length : 0;
  const restantes = reconferir
    ? Math.max(0, alvos.length - proximo)
    : Math.max(0, alvos.length - r.feitos);

  return { ok: true, enviados: r.feitos, restantes, proximo };
}

/** Botão "tentar agora" quando algo ficou preso na fila. */
export async function tentarFilaAgora(): Promise<ResultadoAgenda> {
  const r = await drenarFila(60);
  revalidatePath("/ajustes");
  return { ok: true, enviados: r.feitos, restantes: r.adiados, proximo: 0 };
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
