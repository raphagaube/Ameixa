import type { PlanilhaDoAmeixa } from "@/lib/planilha-ameixa-leitura";

/**
 * A planilha do Ameixa no formato em que ela viaja até o servidor.
 *
 * Com o nome de cada coluna repetido em cada linha, 2.300 lançamentos
 * passavam de 1 MB e a importação falhava antes de chegar ao servidor. Aqui
 * as colunas vão uma vez só, e cada linha é uma lista de valores.
 */
export type PlanilhaCompacta = {
  colunas: string[];
  /** [linha, código, valores na ordem de `colunas`] */
  lancamentos: [number, string, string[]][];
  /** [linha, código, tipo, categoria, subcategoria] */
  categorias: [number, string, string, string, string][];
  /** [linha, código, nome] */
  contas: [number, string, string][];
};

export function compactarPlanilha(p: PlanilhaDoAmeixa): PlanilhaCompacta {
  const colunas = [...new Set(p.lancamentos.flatMap((l) => Object.keys(l.cru)))];
  return {
    colunas,
    lancamentos: p.lancamentos.map((l) => [l.linha, l.codigo, colunas.map((c) => l.cru[c] ?? "")]),
    categorias: p.categorias.map((c) => [c.linha, c.codigo, c.tipo, c.categoria, c.subcategoria]),
    contas: p.contas.map((c) => [c.linha, c.codigo, c.nome]),
  };
}

export function expandirPlanilha(c: PlanilhaCompacta): PlanilhaDoAmeixa {
  return {
    lancamentos: c.lancamentos.map(([linha, codigo, valores]) => ({
      linha,
      codigo,
      cru: Object.fromEntries(c.colunas.map((coluna, i) => [coluna, valores[i] ?? ""])),
    })),
    categorias: c.categorias.map(([linha, codigo, tipo, categoria, subcategoria]) => ({
      linha,
      codigo,
      tipo,
      categoria,
      subcategoria,
    })),
    contas: c.contas.map(([linha, codigo, nome]) => ({ linha, codigo, nome })),
  };
}
