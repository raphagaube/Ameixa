import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
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
 * Carrega o perfil do usuário logado e, no primeiro acesso, semeia as
 * categorias, subcategorias e formas de pagamento padrão.
 *
 * O perfil em si já nasce com o usuário — quem cria é o trigger
 * `on_auth_user_created` no banco.
 */
export async function perfilDoUsuario(): Promise<Perfil | null> {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, tema, cor_acento, cor_pessoal, meta_destaque")
    .eq("id", user.id)
    .maybeSingle();

  // Sem categoria nenhuma significa primeiro acesso: semeia os padrões.
  const { count } = await supabase
    .from("categorias")
    .select("id", { count: "exact", head: true });

  if (count === 0) {
    await supabase.rpc("semear_usuario", { p_user: user.id });
  }

  if (!perfil) return null;

  return {
    ...perfil,
    tema: perfil.tema === "dark" ? "dark" : "light",
    cor_acento: perfil.cor_acento || ACENTO_PADRAO,
  } as Perfil;
}
