import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rotas que podem ser abertas sem estar logado. */
// Política e termos precisam abrir sem login: o Google exige poder ler a
// política de privacidade antes de qualquer pessoa autorizar o acesso à
// agenda, e ninguém deveria ter que criar conta para ler os termos.
const PUBLICAS = ["/entrar", "/auth", "/privacidade", "/termos"];

export async function proxy(req: NextRequest) {
  let resposta = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(paraGravar) {
          for (const { name, value } of paraGravar) {
            req.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request: req });
          for (const { name, value, options } of paraGravar) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser valida o token no servidor do Supabase e renova a sessão.
  // Não troque por getSession: aquele confia no cookie sem verificar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = req.nextUrl.pathname;
  const ehPublica = PUBLICAS.some((p) => caminho.startsWith(p));

  if (!user && !ehPublica) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("proxima", caminho);
    return NextResponse.redirect(url);
  }

  if (user && caminho.startsWith("/entrar")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
}

export const config = {
  matcher: [
    // Tudo, menos estáticos e imagens.
    //
    // sw.js e offline.html precisam ficar de fora: o service worker é
    // buscado sem sessão, e se o proxy responder com o redirecionamento
    // para o login, o navegador recebe HTML no lugar do JavaScript e o
    // registro falha — o app deixa de ser instalável.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
