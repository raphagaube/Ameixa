"use server";

import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoBackup =
  | { ok: true; dados: Record<string, unknown> }
  | { ok: false; erro: string };

/**
 * Junta tudo do usuário num objeto só. O RLS garante que só vem o que é
 * dele — não há filtro por user_id aqui de propósito.
 */
export async function buscarBackup(): Promise<ResultadoBackup> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const tabelas = [
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

  const dados: Record<string, unknown> = {
    gerado_em: new Date().toISOString(),
    versao: 1,
  };

  for (const t of tabelas) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) {
      return { ok: false, erro: `Não deu para exportar ${t}. Tente de novo.` };
    }
    dados[t] = data ?? [];
  }

  return { ok: true, dados };
}
