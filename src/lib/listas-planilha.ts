import type { DadosDeApoio } from "@/lib/tipos/apoio";

/**
 * O que a aba "Listas" da planilha do Ameixa mostra: os nomes exatos que o
 * importador casa — categorias com subcategorias, contas e formas de
 * pagamento.
 */
export type ListasPlanilha = {
  categorias: { nome: string; tipo: "despesa" | "receita"; subcategorias: string[] }[];
  contas: string[];
  formas: string[];
};

/**
 * Fica fora de planilha-ameixa.ts de propósito: as páginas montam as listas
 * no servidor, e importar aquele arquivo arrastaria o SheetJS para lá sem
 * necessidade.
 */
export function listasDaPlanilha(apoio: DadosDeApoio): ListasPlanilha {
  return {
    categorias: apoio.categorias.map((c) => ({
      nome: c.nome,
      tipo: c.tipo,
      subcategorias: c.subcategorias.map((s) => s.nome),
    })),
    contas: apoio.contas.map((c) => c.nome),
    formas: apoio.formas.map((f) => f.nome),
  };
}
