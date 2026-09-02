import { NextResponse, type NextRequest } from "next/server";
import { configAgenda } from "@/lib/agenda/config";
import { gravarConexao } from "@/lib/agenda/credenciais";
import {
  lerTokens,
  TROCAR_TOKEN,
  type MotivoRetorno,
  type RespostaToken,
} from "@/lib/agenda/oauth";
import { garantirAgendas } from "@/lib/agenda/sincronizar";
import { usuarioAtual } from "@/lib/supabase/servidor";
import { COOKIE_ESTADO } from "../conectar/route";

/**
 * Volta do Google com o código de autorização.
 *
 * Todo desfecho — inclusive os ruins — sai por `/ajustes?agenda=<motivo>`,
 * onde a tela traduz para uma frase em português. Erro cru do Google não
 * ajuda ninguém a resolver nada.
 */
export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl;

  const voltar = (motivo: MotivoRetorno) => {
    const r = NextResponse.redirect(`${origin}/ajustes?agenda=${motivo}`);
    r.cookies.delete(COOKIE_ESTADO);
    return r;
  };

  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(`${origin}/entrar`);

  // O caminho mais comum de saída: o dono clicou em "cancelar" no Google.
  if (searchParams.get("error")) {
    return voltar(
      searchParams.get("error") === "access_denied" ? "cancelado" : "erro",
    );
  }

  // Conferência de CSRF. Precisa vir antes de qualquer chamada ao Google:
  // sem ela, um link forjado faria a Ameixa trocar um código de outra
  // pessoa e gravar a agenda dela na conta do dono.
  const estadoDaVolta = searchParams.get("state");
  const estadoGuardado = req.cookies.get(COOKIE_ESTADO)?.value;
  if (!estadoDaVolta || !estadoGuardado || estadoDaVolta !== estadoGuardado) {
    return voltar("estado-invalido");
  }

  const codigo = searchParams.get("code");
  const cfg = configAgenda();
  if (!codigo || !cfg) return voltar("erro");

  let resposta: Response;
  try {
    resposta = await fetch(TROCAR_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: codigo,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        // Byte a byte igual ao que foi mandado na autorização, senão o
        // Google recusa com redirect_uri_mismatch.
        redirect_uri: cfg.urlDeRetorno,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    return voltar("erro");
  }

  const corpo = (await resposta.json().catch(() => null)) as RespostaToken | null;
  const tokens = corpo ? lerTokens(corpo) : null;
  if (!resposta.ok || !tokens) return voltar("erro");

  // Sem refresh token a conexão duraria uma hora. Acontece quando o dono já
  // autorizou antes e o Google decide não repetir o consentimento.
  if (!tokens.refresh) return voltar("sem-refresh");

  const agendas = await garantirAgendas(tokens.access, {
    pagar: null,
    receber: null,
  });
  if (!agendas) return voltar("sem-agenda");

  const gravou = await gravarConexao({
    refresh: tokens.refresh,
    access: tokens.access,
    expiraEm: tokens.expiraEm,
    email: await emailDoGoogle(tokens.access),
    escopos: tokens.escopos,
    pagar: agendas.pagar,
    receber: agendas.receber,
  });

  return voltar(gravou ? "ok" : "erro");
}

/** Só para a tela dizer qual conta foi ligada. Falhar aqui não é grave. */
async function emailDoGoogle(access: string): Promise<string | null> {
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access}` },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const c = (await r.json()) as { email?: string };
    return c.email ?? null;
  } catch {
    return null;
  }
}
