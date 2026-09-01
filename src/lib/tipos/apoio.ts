import type { Categoria } from "@/lib/tipos/categorias";
import type { Conta } from "@/lib/tipos/contas";

export type MetaResumida = {
  id: string;
  nome: string;
  alvo: number;
  guardado: number;
};

export type FormaPagamento = { id: string; nome: string; padrao: boolean };

/** Tudo que o formulário de lançamento precisa ter em mãos para funcionar. */
export type DadosDeApoio = {
  contas: Conta[];
  categorias: Categoria[];
  metas: MetaResumida[];
  formas: FormaPagamento[];
};
