/**
 * Como interpretar uma recusa do Google.
 *
 * Sem esta tabela, o caminho natural do código é tentar de novo para
 * sempre — e um refresh token revogado viraria um laço infinito queimando
 * quota em silêncio.
 */

export type Reacao =
  /** Access token venceu: renove e tente uma vez. */
  | "renovar"
  /** O dono precisa autorizar de novo. Pare e mostre na tela. */
  | "reconectar"
  /** Excesso de requisições: espere e volte. */
  | "esperar"
  /** O evento sumiu do lado do Google. */
  | "evento-sumiu"
  /** A agenda sumiu do lado do Google. */
  | "agenda-sumiu"
  /** Não dá para consertar tentando de novo. */
  | "desistir";

type Corpo = {
  error?: string | { message?: string; errors?: { reason?: string }[] };
  error_description?: string;
};

function motivos(corpo: Corpo): string {
  const e = corpo.error;
  if (typeof e === "string") return `${e} ${corpo.error_description ?? ""}`;
  const razoes = e?.errors?.map((x) => x.reason ?? "").join(" ") ?? "";
  return `${razoes} ${e?.message ?? ""}`;
}

export function classificarErro(
  status: number,
  corpo: unknown,
  alvo: "evento" | "agenda" | "token" = "evento",
): Reacao {
  const texto = motivos((corpo ?? {}) as Corpo).toLowerCase();

  // O que mata a integração de vez. `invalid_grant` é o Google dizendo que
  // o refresh token não vale mais: expirou, foi revogado, ou a senha mudou.
  if (texto.includes("invalid_grant")) return "reconectar";
  if (texto.includes("invalid_client")) return "desistir";

  if (status === 401) return alvo === "token" ? "reconectar" : "renovar";

  if (status === 403) {
    if (texto.includes("insufficientpermissions")) return "reconectar";
    if (texto.includes("ratelimitexceeded") || texto.includes("userratelimit"))
      return "esperar";
    if (texto.includes("quotaexceeded")) return "esperar";
    return "desistir";
  }

  if (status === 404 || status === 410) {
    return alvo === "agenda" ? "agenda-sumiu" : "evento-sumiu";
  }

  if (status === 429) return "esperar";
  if (status >= 500) return "esperar";

  return "desistir";
}

/** Espera exponencial com sacudida, para duas abas não voltarem juntas. */
export function esperaDaTentativa(tentativa: number, sorte = Math.random()): number {
  const base = Math.min(1000 * 2 ** tentativa, 60_000);
  return Math.round(base * (0.75 + sorte * 0.5));
}

export const MAX_TENTATIVAS = 4;
