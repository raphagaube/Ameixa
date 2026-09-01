import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Categoria } from "@/lib/tipos/categorias";

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
