import { PAGINA } from "@/lib/supabase/paginas";

/**
 * Montagem do backup, página a página.
 *
 * Quem pagina é o navegador: cada pedido ao servidor traz no máximo mil
 * linhas de uma tabela. De uma vez só não dá por dois motivos — o Supabase
 * corta cada consulta em 1000 linhas sem avisar (o backup antigo saía com os
 * mil primeiros lançamentos e cara de completo), e a Vercel limita o tamanho
 * de cada resposta, o que voltaria a quebrar o backup conforme os dados
 * crescem.
 */

export const TABELAS_DO_BACKUP = [
  "perfis",
  "contas",
  "cartoes",
  "categorias",
  "subcategorias",
  "formas_pagamento",
  "metas",
  "orcamentos",
  "lancamentos",
] as const;

export type TabelaDoBackup = (typeof TABELAS_DO_BACKUP)[number];

/** Como cada tabela é chamada nas mensagens da tela. */
export const NOME_DA_TABELA: Record<TabelaDoBackup, string> = {
  perfis: "perfil",
  contas: "contas",
  cartoes: "cartões",
  categorias: "categorias",
  subcategorias: "subcategorias",
  formas_pagamento: "formas de pagamento",
  metas: "metas",
  orcamentos: "orçamentos",
  lancamentos: "lançamentos",
};

export type PaginaDoBackup =
  | { ok: true; linhas: Record<string, unknown>[]; /** Quantas linhas a tabela tem ao todo. */ total: number }
  | { ok: false; erro: string };

export type ResultadoBackup =
  | { ok: true; dados: Record<string, unknown> }
  | { ok: false; erro: string };

/**
 * Lê todas as tabelas até o fim e confere cada uma contra a contagem do
 * banco. Backup que perde dado em silêncio é pior do que não ter backup:
 * aqui ou vem tudo, ou vem erro.
 */
export async function montarBackup(
  buscar: (tabela: TabelaDoBackup, pagina: number) => Promise<PaginaDoBackup>,
  aoProgredir?: (tabela: TabelaDoBackup, lidas: number, total: number) => void,
): Promise<ResultadoBackup> {
  const dados: Record<string, unknown> = {
    gerado_em: new Date().toISOString(),
    versao: 1,
  };
  const contagem: Record<string, number> = {};

  for (const tabela of TABELAS_DO_BACKUP) {
    const linhas: Record<string, unknown>[] = [];
    let total = 0;

    for (let pagina = 0; ; pagina++) {
      const r = await buscar(tabela, pagina);
      if (!r.ok) return r;
      total = r.total;
      for (const linha of r.linhas) linhas.push(linha);
      aoProgredir?.(tabela, linhas.length, total);
      if (r.linhas.length < PAGINA || linhas.length >= total) break;
    }

    if (linhas.length !== total) {
      return {
        ok: false,
        erro: `O backup de ${NOME_DA_TABELA[tabela]} saiu incompleto (${linhas.length} de ${total}) e foi descartado. Tente de novo.`,
      };
    }

    dados[tabela] = linhas;
    contagem[tabela] = linhas.length;
  }

  // Quantas linhas de cada tabela: dá para conferir o arquivo sem abri-lo inteiro.
  dados.contagem = contagem;
  return { ok: true, dados };
}
