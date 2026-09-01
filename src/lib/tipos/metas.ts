export type UnidadePrazo = "dias" | "semanas" | "meses" | "anos";

export const ROTULO_PRAZO: Record<UnidadePrazo, string> = {
  dias: "Dias",
  semanas: "Semanas",
  meses: "Meses",
  anos: "Anos",
};

export const APLICACOES = ["Poupança", "CDB", "Tesouro", "Ações"] as const;

export type Meta = {
  id: string;
  nome: string;
  alvo: number;
  guardado: number;
  conta_id: string | null;
  aplicacao: string;
  tem_prazo: boolean;
  prazo_n: number | null;
  prazo_unidade: UnidadePrazo | null;
  conta: { nome: string; cor: string } | null;
};

/** Quanto da meta já foi alcançado, limitado a 100 para a barra não vazar. */
export function percentualDaMeta(m: Pick<Meta, "alvo" | "guardado">): number {
  if (m.alvo <= 0) return 0;
  return Math.min(Math.round((m.guardado / m.alvo) * 100), 100);
}

export function prazoPorExtenso(m: Meta): string | null {
  if (!m.tem_prazo || !m.prazo_n || !m.prazo_unidade) return null;
  const u = ROTULO_PRAZO[m.prazo_unidade].toLowerCase();
  const singular = m.prazo_n === 1 ? u.replace(/e?s$/, "") : u;
  return `${m.prazo_n} ${singular}`;
}
