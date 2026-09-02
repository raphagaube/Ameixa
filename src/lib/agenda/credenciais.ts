import "server-only";

import { cache } from "react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { configAgenda } from "./config";
import { cifrar, decifrar } from "./cripto";
import { classificarErro } from "./erros";
import { lerTokens, TROCAR_TOKEN, REVOGAR, type RespostaToken } from "./oauth";
import type { Agenda } from "./evento";

/**
 * Credenciais do Google guardadas no schema `privado`, sempre cifradas.
 *
 * Cifradas porque o servidor da Ameixa fala com o Postgres como
 * `authenticated`, o mesmo papel do navegador: toda RPC que o servidor
 * chama, o navegador também chama. O que sai daqui em claro é o que pode
 * vazar.
 */

type LinhaCredencial = {
  refresh_cifrado: string;
  access_cifrado: string | null;
  access_expira_em: string | null;
  agenda_pagar_id: string | null;
  agenda_receber_id: string | null;
  estado: string;
};

export type Credenciais = {
  access: string;
  agendaId: (a: Agenda) => string | null;
  pagar: string | null;
  receber: string | null;
};

/** Motivo pelo qual não há como falar com o Google agora. */
export type SemCredencial =
  | "nao-configurado"
  | "nao-conectado"
  | "reconectar"
  | "indisponivel";

async function linha(): Promise<LinhaCredencial | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("agenda_credenciais");
  const l = (Array.isArray(data) ? data[0] : data) as LinhaCredencial | null;
  return l?.refresh_cifrado ? l : null;
}

async function marcar(estado: string, falha: string | null) {
  const supabase = await criarClienteServidor();
  await supabase.rpc("agenda_marcar_estado", {
    p_estado: estado,
    p_falha: falha,
  });
}

/**
 * Access token válido, renovando se preciso.
 *
 * Em cache por requisição: sem isso, salvar uma série de doze parcelas
 * renovaria o token doze vezes.
 */
export const obterCredenciais = cache(
  async (): Promise<Credenciais | SemCredencial> => {
    const cfg = configAgenda();
    if (!cfg) return "nao-configurado";

    let l: LinhaCredencial | null;
    try {
      l = await linha();
    } catch {
      return "indisponivel";
    }
    if (!l) return "nao-conectado";

    // O Google já recusou este refresh token. Insistir só queima requisição.
    if (l.estado === "reconectar") return "reconectar";

    const agendaId = (a: Agenda) =>
      a === "pagar" ? l!.agenda_pagar_id : l!.agenda_receber_id;

    const monta = (access: string): Credenciais => ({
      access,
      agendaId,
      pagar: l!.agenda_pagar_id,
      receber: l!.agenda_receber_id,
    });

    // Ainda vale? `lerTokens` já descontou um minuto de folga na gravação.
    if (l.access_cifrado && l.access_expira_em) {
      if (new Date(l.access_expira_em) > new Date()) {
        try {
          return monta(decifrar(l.access_cifrado));
        } catch {
          // Chave trocada ou linha corrompida: segue para a renovação.
        }
      }
    }

    let refresh: string;
    try {
      refresh = decifrar(l.refresh_cifrado);
    } catch {
      // Sem a chave não há como usar o token guardado. Do ponto de vista do
      // dono é a mesma coisa que ter expirado: precisa autorizar de novo.
      await marcar("reconectar", "chave-de-cifragem");
      return "reconectar";
    }

    let r: Response;
    try {
      r = await fetch(TROCAR_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          refresh_token: refresh,
          grant_type: "refresh_token",
        }),
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
    } catch {
      return "indisponivel";
    }

    const corpo = (await r.json().catch(() => null)) as RespostaToken | null;

    if (!r.ok || !corpo?.access_token) {
      const reacao = classificarErro(r.status, corpo, "token");
      if (reacao === "reconectar" || reacao === "desistir") {
        await marcar("reconectar", corpo?.error ?? String(r.status));
        return "reconectar";
      }
      return "indisponivel";
    }

    const t = lerTokens(corpo);
    if (!t) return "indisponivel";

    const supabase = await criarClienteServidor();
    await supabase.rpc("agenda_gravar_access", {
      p_access: cifrar(t.access),
      p_expira: t.expiraEm.toISOString(),
    });

    return monta(t.access);
  },
);

/** Chamado pelo retorno do OAuth, com os tokens recém-trocados. */
export async function gravarConexao(p: {
  refresh: string;
  access: string;
  expiraEm: Date;
  email: string | null;
  escopos: string;
  pagar: string | null;
  receber: string | null;
}) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("agenda_gravar", {
    p_refresh: cifrar(p.refresh),
    p_access: cifrar(p.access),
    p_expira: p.expiraEm.toISOString(),
    p_email: p.email,
    p_escopos: p.escopos,
    p_pagar: p.pagar,
    p_receber: p.receber,
  });
  return !error;
}

/** Anota os ids das agendas recriadas, sem exigir uma reconexão inteira. */
export async function gravarAgendas(pagar: string | null, receber: string | null) {
  const supabase = await criarClienteServidor();
  await supabase.rpc("agenda_gravar_agendas", {
    p_pagar: pagar,
    p_receber: receber,
  });
}

export async function marcarReconectar(motivo: string) {
  await marcar("reconectar", motivo);
}

/**
 * Desliga a conexão. Revoga o acesso no Google primeiro — se só apagássemos
 * a linha, a Ameixa continuaria com permissão na conta dele para sempre.
 */
export async function desconectar(): Promise<boolean> {
  const cfg = configAgenda();
  const l = await linha().catch(() => null);

  if (cfg && l) {
    try {
      const refresh = decifrar(l.refresh_cifrado);
      await fetch(`${REVOGAR}?token=${encodeURIComponent(refresh)}`, {
        method: "POST",
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      // Token já inválido do lado do Google, ou rede fora. Desconectar aqui
      // não pode depender disso.
    }
  }

  const supabase = await criarClienteServidor();
  await supabase.from("eventos_agenda").delete().neq("evento_id", "");
  await supabase.from("fila_agenda").delete().neq("acao", "");
  const { error } = await supabase.rpc("agenda_desconectar");
  return !error;
}
