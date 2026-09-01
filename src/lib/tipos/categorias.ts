export type Subcategoria = { id: string; nome: string };

export type Categoria = {
  id: string;
  nome: string;
  tipo: "despesa" | "receita";
  cor: string;
  cor_texto: string;
  ordem: number;
  subcategorias: Subcategoria[];
};
