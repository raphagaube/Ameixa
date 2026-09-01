import "server-only";
import { cache } from "react";
import { criarClienteServidor, usuarioAtual } from "@/lib/supabase/servidor";
import { ACENTO_PADRAO, type Modo } from "@/lib/theme";

export type Perfil = {
  id: string;
  nome: string;
  tema: Modo;
  cor_acento: string;
  cor_pessoal: string;
  meta_destaque: string | null;
};

/**
 * Perfil do usuário logado.
 *
 * A semeadura do primeiro acesso NÃO mora mais aqui: ela exigia uma contagem
 * de categorias a cada carregamento de tela, e isso é uma ida ao banco por
 * navegação para checar algo que só acontece uma vez na vida. Quem cuida
 * disso agora é `dadosDeApoio`, que já busca as categorias de qualquer jeito.
 */
export const perfilDoUsuario = cache(async (): Promise<Perfil | null> => {
  const user = await usuarioAtual();
  if (!user) return null;

  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, tema, cor_acento, cor_pessoal, meta_destaque")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) return null;

  return {
    ...perfil,
    tema: perfil.tema === "dark" ? "dark" : "light",
    cor_acento: perfil.cor_acento || ACENTO_PADRAO,
  } as Perfil;
});
