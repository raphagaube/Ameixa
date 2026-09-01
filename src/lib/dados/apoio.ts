import "server-only";
import { cache } from "react";
import { categoriasDoUsuario } from "@/lib/dados/categorias";
import { contasDoUsuario } from "@/lib/dados/contas";
import { criarClienteServidor, usuarioAtual } from "@/lib/supabase/servidor";
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

/**
 * Tudo que o formulário de lançamento precisa, numa rodada só de consultas
 * em paralelo.
 *
 * A semeadura do primeiro acesso vive aqui porque as categorias já são
 * buscadas de qualquer forma: se a lista voltar vazia, é primeiro acesso.
 * Antes existia uma contagem separada em toda navegação só para descobrir
 * isso — uma ida ao banco desperdiçada por tela.
 */
export const dadosDeApoio = cache(async (): Promise<DadosDeApoio> => {
  const [contas, categorias, metas, formas] = await Promise.all([
    contasDoUsuario(),
    categoriasDoUsuario(),
    metasResumidas(),
    formasDePagamento(),
  ]);

  if (categorias.length === 0) {
    const user = await usuarioAtual();
    if (user) {
      const supabase = await criarClienteServidor();
      await supabase.rpc("semear_usuario", { p_user: user.id });
      // O seed do handoff cria quatro bancos de exemplo. O app é entregue
      // vazio: banco é do usuário, não nosso. Só roda no primeiro acesso,
      // quando ainda não há conta cadastrada.
      await supabase.from("contas").delete().eq("user_id", user.id);

      return {
        contas: [],
        categorias: await categoriasDoUsuario(),
        metas,
        formas: await formasDePagamento(),
      };
    }
  }

  return { contas, categorias, metas, formas };
});
