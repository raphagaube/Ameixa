import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { configAgenda } from "@/lib/agenda/config";
import { montarUrlAutorizacao } from "@/lib/agenda/oauth";
import { usuarioAtual } from "@/lib/supabase/servidor";

export const COOKIE_ESTADO = "ameixa_agenda_estado";

/**
 * Começo da conexão com o Google Agenda.
 *
 * Esta rota é protegida pelo proxy como qualquer outra tela: o matcher pega
 * tudo que não é arquivo estático e `/api/agenda` não está em `PUBLICAS`.
 */
export async function GET(req: NextRequest) {
  const { origin } = req.nextUrl;

  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(`${origin}/entrar`);

  const cfg = configAgenda();
  if (!cfg) {
    return NextResponse.redirect(`${origin}/ajustes?agenda=nao-configurado`);
  }

  const estado = randomBytes(32).toString("base64url");
  const resposta = NextResponse.redirect(
    montarUrlAutorizacao({
      clientId: cfg.clientId,
      urlDoSite: cfg.urlDoSite,
      estado,
    }),
  );

  resposta.cookies.set(COOKIE_ESTADO, estado, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/api/agenda",
    maxAge: 600,
    // `lax` e não `strict`: com `strict` o cookie não acompanha a volta
    // vinda do accounts.google.com, e a conferência abaixo falharia sempre.
    sameSite: "lax",
  });

  return resposta;
}
