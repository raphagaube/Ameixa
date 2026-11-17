export type Subcategoria = { id: string; nome: string };

export type Categoria = {
  id: string;
  nome: string;
  tipo: "despesa" | "receita";
  cor: string;
  cor_texto: string;
  icone?: string | null;
  cor_texto_modo?: "auto" | "branco" | "preto" | null;
  ordem: number;
  subcategorias: Subcategoria[];
};
