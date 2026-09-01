import "server-only";
import { categoriasDoUsuario } from "@/lib/dados/categorias";
import { contasDoUsuario } from "@/lib/dados/contas";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { DadosDeApoio, FormaPagamento, MetaResumida } from "@/lib/tipos/apoio";

async function metasResumidas(): Promise<MetaResumida[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("metas")
    .select("id, nome, alvo, guardado")
    .order("criado_em", { ascending: true });

  return (data ?? []).map((m) => ({
    ...m,
    alvo: Number(m.alvo),
    guardado: Number(m.guardado),
  }));
}

async function formasDePagamento(): Promise<FormaPagamento[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("formas_pagamento")
    .select("id, nome, padrao")
    .order("padrao", { ascending: false })
    .order("nome", { ascending: true });

  return data ?? [];
}

/** Uma chamada só para tudo que o formulário de lançamento precisa. */
export async function dadosDeApoio(): Promise<DadosDeApoio> {
  const [contas, categorias, metas, formas] = await Promise.all([
    contasDoUsuario(),
    categoriasDoUsuario(),
    metasResumidas(),
    formasDePagamento(),
  ]);
  return { contas, categorias, metas, formas };
}
