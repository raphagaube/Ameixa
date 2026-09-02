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
    .order("nome", { ascending: true });

  if (error || !data) return null;

  // Ordena aqui, e não no banco: a comparação do Postgres não conhece as
  // regras do português, e "Água" cairia depois de "Vestuário". A do
  // navegador com "pt-BR" põe cada acento no lugar certo.
  //
  // A coluna `ordem` deixou de mandar na lista: ela vinha da semeadura, e
  // fazia as categorias criadas pelo dono aparecerem todas antes das
  // originais, sem que nada na tela explicasse por quê.
  const porNome = (a: { nome: string }, b: { nome: string }) =>
    a.nome.localeCompare(b.nome, "pt-BR");

  return data
    .map((c) => ({
      ...c,
      subcategorias: [...(c.subcategorias ?? [])].sort(porNome),
    }))
    .sort(porNome) as Categoria[];
}
