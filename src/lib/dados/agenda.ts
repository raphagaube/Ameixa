import "server-only";

import { cache } from "react";
import { agendaConfigurada } from "@/lib/agenda/config";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * O que a tela de Ajustes precisa saber sobre a conexão com o Google.
 *
 * Nunca devolve o refresh token, nem cifrado: nada nesta tela precisa dele,
 * e o que não sai daqui não vaza.
 */

export type StatusAgenda = {
  configurado: boolean;
  conectado: boolean;
  precisaReconectar: boolean;
  email: string | null;
  sincronizados: number;
  pendentesSemEvento: number;
  naFila: number;
};

const VAZIO: StatusAgenda = {
  configurado: false,
  conectado: false,
  precisaReconectar: false,
  email: null,
  sincronizados: 0,
  pendentesSemEvento: 0,
  naFila: 0,
};

export const statusAgenda = cache(async (): Promise<StatusAgenda> => {
  const configurado = agendaConfigurada();
  if (!configurado) return VAZIO;

  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("agenda_status");
  const linha = (Array.isArray(data) ? data[0] : data) as
    | { estado: string; email_google: string | null }
    | null
    | undefined;

  if (!linha) return { ...VAZIO, configurado };

  const [sincronizados, fila, pendentes] = await Promise.all([
    supabase.from("eventos_agenda").select("*", { count: "exact", head: true }),
    supabase.from("fila_agenda").select("*", { count: "exact", head: true }),
    contarPendentesSemEvento(supabase),
  ]);

  return {
    configurado,
    conectado: true,
    precisaReconectar: linha.estado === "reconectar",
    email: linha.email_google,
    sincronizados: sincronizados.count ?? 0,
    naFila: fila.count ?? 0,
    pendentesSemEvento: pendentes,
  };
});

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/**
 * Quantas pendências ainda não têm compromisso.
 *
 * O PostgREST não faz `left join ... is null`, então é uma subtração: total
 * de pendências menos as que já têm vínculo. Duas contagens são mais baratas
 * que trazer milhares de ids para comparar em memória.
 */
async function contarPendentesSemEvento(supabase: Cliente): Promise<number> {
  const [total, comEvento] = await Promise.all([
    supabase
      .from("lancamentos")
      .select("*", { count: "exact", head: true })
      .in("situacao", ["a_pagar", "a_receber"]),
    supabase
      .from("lancamentos")
      .select("id, eventos_agenda!inner(lancamento_id)", {
        count: "exact",
        head: true,
      })
      .in("situacao", ["a_pagar", "a_receber"]),
  ]);

  return Math.max(0, (total.count ?? 0) - (comEvento.count ?? 0));
}
