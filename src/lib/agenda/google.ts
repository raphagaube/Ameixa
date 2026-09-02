import "server-only";

import { classificarErro, type Reacao } from "./erros";
import { NOME_AGENDA, type Agenda, type CorpoEvento } from "./evento";

/**
 * As seis chamadas que a Ameixa faz ao Google Calendar.
 *
 * `fetch` cru e não a biblioteca `googleapis`: são dezenas de megabytes de
 * dependência para seis requisições HTTP, num projeto que tem quinze pacotes
 * no total.
 */

const BASE = "https://www.googleapis.com/calendar/v3";
const FUSO = "America/Sao_Paulo";

/** Nenhuma chamada ao Google pode segurar o salvamento de um lançamento. */
const LIMITE_MS = 4000;

export type Falha = { ok: false; reacao: Reacao; status: number; detalhe: string };
export type Resposta<T> = { ok: true; dados: T } | Falha;

async function chamar<T>(
  access: string,
  caminho: string,
  init: RequestInit & { alvo?: "evento" | "agenda" } = {},
): Promise<Resposta<T>> {
  const { alvo = "evento", ...resto } = init;
  let r: Response;
  try {
    r = await fetch(`${BASE}${caminho}`, {
      ...resto,
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        ...resto.headers,
      },
      signal: AbortSignal.timeout(LIMITE_MS),
      cache: "no-store",
    });
  } catch (e) {
    // Rede fora, ou os 4 segundos estouraram. Vale tentar de novo depois.
    return {
      ok: false,
      reacao: "esperar",
      status: 0,
      detalhe: e instanceof Error ? e.message : "rede",
    };
  }

  if (r.status === 204) return { ok: true, dados: undefined as T };

  const corpo = await r.json().catch(() => null);

  if (!r.ok) {
    return {
      ok: false,
      reacao: classificarErro(r.status, corpo, alvo),
      status: r.status,
      detalhe: JSON.stringify(corpo)?.slice(0, 300) ?? String(r.status),
    };
  }

  return { ok: true, dados: corpo as T };
}

type CalendarioResumo = { id: string; summary?: string };

export function lerCalendario(access: string, id: string) {
  return chamar<CalendarioResumo>(
    access,
    `/calendars/${encodeURIComponent(id)}`,
    { alvo: "agenda" },
  );
}

export function listarCalendarios(access: string) {
  return chamar<{ items?: CalendarioResumo[] }>(
    access,
    "/users/me/calendarList?minAccessRole=owner&maxResults=250",
    { alvo: "agenda" },
  );
}

export function criarCalendario(access: string, agenda: Agenda) {
  return chamar<CalendarioResumo>(access, "/calendars", {
    method: "POST",
    alvo: "agenda",
    body: JSON.stringify({
      summary: NOME_AGENDA[agenda],
      description:
        "Criada pela Ameixa para as suas contas. Não renomeie: é assim que o app a reconhece.",
      // Sem isto a agenda pode nascer em UTC, e o lembrete cairia 3h fora.
      timeZone: FUSO,
    }),
  });
}

export function criarEvento(access: string, calendario: string, corpo: CorpoEvento) {
  return chamar<{ id: string }>(
    access,
    `/calendars/${encodeURIComponent(calendario)}/events`,
    { method: "POST", body: JSON.stringify(corpo) },
  );
}

export function atualizarEvento(
  access: string,
  calendario: string,
  evento: string,
  corpo: CorpoEvento,
) {
  return chamar<{ id: string }>(
    access,
    `/calendars/${encodeURIComponent(calendario)}/events/${encodeURIComponent(evento)}`,
    { method: "PUT", body: JSON.stringify(corpo) },
  );
}

/** Move o evento entre as duas agendas preservando o id. */
export function moverEvento(
  access: string,
  de: string,
  evento: string,
  para: string,
) {
  return chamar<{ id: string }>(
    access,
    `/calendars/${encodeURIComponent(de)}/events/${encodeURIComponent(evento)}/move?destination=${encodeURIComponent(para)}`,
    { method: "POST" },
  );
}

export function apagarEvento(access: string, calendario: string, evento: string) {
  return chamar<void>(
    access,
    `/calendars/${encodeURIComponent(calendario)}/events/${encodeURIComponent(evento)}`,
    { method: "DELETE" },
  );
}
