import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";

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

/** Categorias do usuário com as subcategorias já aninhadas. */
export async function categoriasDoUsuario(): Promise<Categoria[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("categorias")
    .select("id, nome, tipo, cor, cor_texto, ordem, subcategorias(id, nome)")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error || !data) return [];

  return data.map((c) => ({
    ...c,
    subcategorias: [...(c.subcategorias ?? [])].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    ),
  })) as Categoria[];
}
