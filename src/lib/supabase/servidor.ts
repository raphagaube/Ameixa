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

/**
 * Usuário autenticado, ou null.
 *
 * getUser() bate no servidor do Supabase a cada chamada. Sem o cache, uma
 * navegação faria isso cinco ou seis vezes — o layout, o perfil, os dados de
 * apoio e cada consulta pediam o usuário por conta própria. Com cache(), é
 * uma vez por requisição.
 */
export const usuarioAtual = cache(async () => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
