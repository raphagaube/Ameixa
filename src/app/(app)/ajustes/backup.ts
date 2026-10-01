"use server";

import { TABELAS_DO_BACKUP, NOME_DA_TABELA, type PaginaDoBackup, type TabelaDoBackup } from "@/lib/backup";
import { PAGINA } from "@/lib/supabase/paginas";
import { criarClienteServidor, usuarioAtual } from "@/lib/supabase/servidor";

/**
 * Uma página de uma tabela do backup, com o total de linhas da tabela.
 *
 * O RLS garante que só vem o que é do usuário — não há filtro por user_id
 * aqui de propósito. Quem junta as páginas e confere o total é
 * `montarBackup`, no navegador.
 */
export async function buscarPaginaDoBackup(tabela: string, pagina: number): Promise<PaginaDoBackup> {
  if (!(TABELAS_DO_BACKUP as readonly string[]).includes(tabela)) {
    return { ok: false, erro: "Tabela desconhecida." };
  }
  if (!Number.isInteger(pagina) || pagina < 0 || pagina > 10000) {
    return { ok: false, erro: "Página inválida." };
  }
  const nome = NOME_DA_TABELA[tabela as TabelaDoBackup];

  const user = await usuarioAtual();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const supabase = await criarClienteServidor();
  const de = pagina * PAGINA;
  // Todas as tabelas têm `id` como chave primária: é a ordem estável que a
  // paginação precisa para não repetir nem pular linha.
  const { data, count, error } = await supabase
    .from(tabela)
    .select("*", { count: "exact" })
    .order("id", { ascending: true })
    .range(de, de + PAGINA - 1);

  if (error || !data || count === null) {
    return { ok: false, erro: `Não deu para exportar ${nome}. Tente de novo.` };
  }
  return { ok: true, linhas: data as Record<string, unknown>[], total: count };
}
