import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Categoria } from "@/lib/tipos/categorias";

/**
 * Categorias do usuário com as subcategorias já aninhadas.
 *
 * Devolve `null` quando a leitura FALHA, e `[]` só quando o usuário
 * realmente não tem categoria. A diferença não é preciosismo: quem chama
 * usa a lista vazia para decidir que é primeiro acesso, e confundir os dois
 * casos já custou os bancos e o vínculo de conta de todos os lançamentos
 * do dono uma vez.
 */
export async function categoriasDoUsuario(): Promise<Categoria[] | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("categorias")
    .select("id, nome, tipo, cor, cor_texto, ordem, subcategorias(id, nome)")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error || !data) return null;

  return data.map((c) => ({
    ...c,
    subcategorias: [...(c.subcategorias ?? [])].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    ),
  })) as Categoria[];
}
