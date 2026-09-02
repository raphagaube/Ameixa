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

  // `null` é falha de leitura, `[]` é primeiro acesso de verdade. Semear
  // por causa de um erro de rede seria inofensivo; APAGAR por causa dele
  // não é — e era o que este trecho fazia antes.
  if (categorias === null) {
    return { contas, categorias: [], metas, formas };
  }

  if (categorias.length === 0) {
    const user = await usuarioAtual();
    if (user) {
      const supabase = await criarClienteServidor();
      await supabase.rpc("semear_usuario", { p_user: user.id });
      // Nada é apagado aqui. A semeadura não cria mais bancos de exemplo,
      // então não há o que limpar — e nenhum caminho do app tem permissão
      // de remover as contas do dono sem ele pedir.
      return {
        contas,
        categorias: (await categoriasDoUsuario()) ?? [],
        metas,
        formas: await formasDePagamento(),
      };
    }
  }

  return { contas, categorias, metas, formas };
});
