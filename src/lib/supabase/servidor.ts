import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Cliente do Supabase para Server Components, Server Actions e Route Handlers.
 * A sessão vive em cookie; nunca use a chave secreta aqui.
 *
 * Envolvido em cache() do React: numa mesma renderização, layout e página
 * pedem o cliente várias vezes e não faz sentido remontar a cada chamada.
 */
export const criarClienteServidor = cache(async () => {
  const armazem = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return armazem.getAll();
        },
        setAll(paraGravar) {
          try {
            for (const { name, value, options } of paraGravar) {
              armazem.set(name, value, options);
            }
          } catch {
            // Server Component não pode gravar cookie. O proxy já renova
            // a sessão, então aqui a falha é esperada e inofensiva.
          }
        },
      },
    },
  );
});

export type UsuarioAtual = { id: string; email: string | null };

/**
 * Usuário autenticado, ou null.
 *
 * Vem de getClaims(), que confere a assinatura do token com as chaves ES256
 * do projeto, sem ida ao servidor do Supabase. Antes era getUser(), que fazia
 * essa viagem em toda troca de tela — e o perfil só consultava o banco depois
 * dela voltar. O cache() mantém uma conferência por requisição.
 */
export const usuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: claims.email ?? null };
});
