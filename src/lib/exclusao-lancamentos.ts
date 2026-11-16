import { z } from "zod";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").refine((iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}, "Data inválida.");

export const filtroExclusao = z.discriminatedUnion("alcance", [
  z.object({ alcance: z.literal("todos") }),
  z.object({ alcance: z.literal("periodo"), de: data, ate: data }),
]).refine((f) => f.alcance === "todos" || f.de <= f.ate, {
  message: "A data final precisa ser igual ou posterior à inicial.",
});

export type FiltroExclusao = z.infer<typeof filtroExclusao>;
export const TAMANHO_LOTE_EXCLUSAO = 400;

/** O mesmo recorte é aplicado na leitura e no DELETE, inclusive o dono. */
type ConsultaFiltravel = {
  eq: (coluna: string, valor: string) => ConsultaFiltravel;
  gte: (coluna: string, valor: string) => ConsultaFiltravel;
  lte: (coluna: string, valor: string) => ConsultaFiltravel;
};

export function filtrarExclusao<T>(consulta: T, usuario: string, filtro: FiltroExclusao, ateCriadoEm: string): T {
  // Mantém o tipo da projeção do PostgREST sem expandir seus tipos recursivos.
  let q = consulta as unknown as ConsultaFiltravel;
  q = q.eq("user_id", usuario).lte("criado_em", ateCriadoEm);
  if (filtro.alcance === "periodo") {
    q = q.gte("data_registro", filtro.de).lte("data_registro", filtro.ate);
  }
  return q as unknown as T;
}
