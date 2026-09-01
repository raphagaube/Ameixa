export type EstadoOrcamento = "ok" | "quase" | "ultrapassou";

export type Orcamento = {
  id: string;
  categoria_id: string;
  categoria: string;
  cor: string;
  limite: number;
  gasto: number;
};

/**
 * Regra 6 do modelo de dados: abaixo de 80% verde, de 80 a 99 âmbar,
 * 100 ou mais vermelho.
 */
export function estadoDoOrcamento(gasto: number, limite: number): EstadoOrcamento {
  if (limite <= 0) return "ok";
  const pct = (gasto / limite) * 100;
  if (pct >= 100) return "ultrapassou";
  if (pct >= 80) return "quase";
  return "ok";
}

export function percentualDoOrcamento(gasto: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.round((gasto / limite) * 100);
}

export const COR_ESTADO: Record<EstadoOrcamento, string> = {
  ok: "var(--ok)",
  quase: "var(--warn)",
  ultrapassou: "var(--bad)",
};

export const FRASE_ESTADO: Record<EstadoOrcamento, string> = {
  ok: "Tudo certo por aqui.",
  quase: "Quase lá — segure o ritmo.",
  ultrapassou: "Você ultrapassou o limite.",
};
