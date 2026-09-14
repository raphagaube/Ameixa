import type { DadosDeApoio } from "@/lib/tipos/apoio";

/**
 * Categorias, contas e formas que vão para a planilha do Ameixa — com o
 * código de cada uma, que é o que permite renomear pela planilha: o nome
 * pode mudar inteiro, e o código continua dizendo de quem se trata.
 */
export type ListasPlanilha = {
  categorias: {
    id: string;
    nome: string;
    tipo: "despesa" | "receita";
    subcategorias: { id: string; nome: string }[];
  }[];
  contas: { id: string; nome: string }[];
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
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      subcategorias: c.subcategorias.map((s) => ({ id: s.id, nome: s.nome })),
    })),
    contas: apoio.contas.map((c) => ({ id: c.id, nome: c.nome })),
    formas: apoio.formas.map((f) => f.nome),
  };
}
