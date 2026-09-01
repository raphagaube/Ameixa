import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente do Supabase para Server Components, Server Actions e Route Handlers.
 * A sessão vive em cookie; nunca use a chave secreta aqui.
 */
export async function criarClienteServidor() {
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
            // Server Component não pode gravar cookie. O middleware já renova
            // a sessão, então aqui a falha é esperada e inofensiva.
          }
        },
      },
    },
  );
}

/** Usuário autenticado, ou null. Valida no servidor do Supabase. */
export async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
