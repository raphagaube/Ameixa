import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * Destino dos links de e-mail (confirmação de cadastro e redefinição de senha).
 * Troca o código pela sessão em cookie e devolve o usuário ao app.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const proxima = searchParams.get("proxima") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?falha=sem-codigo`);
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/entrar?falha=link-invalido`);
  }

  return NextResponse.redirect(`${origin}${proxima}`);
}
