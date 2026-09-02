/**
 * Montagem das URLs do OAuth do Google e leitura das respostas de token.
 *
 * Puro e testável: o teste daqui existe sobretudo para ninguém remover o
 * `prompt=consent` num refactor. Sem ele, a segunda conexão do dono devolve
 * código mas nenhum refresh token, e a integração morre uma hora depois —
 * um bug que só apareceria semanas adiante.
 */

export const ESCOPOS = [
  // Só as agendas que este app criou. Um bug aqui estraga as duas agendas
  // da Ameixa e não encosta na agenda pessoal do dono.
  "https://www.googleapis.com/auth/calendar.app.created",
  // Para mostrar em Ajustes qual conta Google está ligada.
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export const AUTORIZAR = "https://accounts.google.com/o/oauth2/v2/auth";
export const TROCAR_TOKEN = "https://oauth2.googleapis.com/token";
export const REVOGAR = "https://oauth2.googleapis.com/revoke";
export const CAMINHO_RETORNO = "/api/agenda/retorno";

export function urlDeRetorno(urlDoSite: string): string {
  return `${urlDoSite.replace(/\/$/, "")}${CAMINHO_RETORNO}`;
}

export function montarUrlAutorizacao(p: {
  clientId: string;
  urlDoSite: string;
  estado: string;
}): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: urlDeRetorno(p.urlDoSite),
    response_type: "code",
    scope: ESCOPOS,
    // Sem os dois de baixo não vem refresh token, e a conexão dura 1 hora.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: p.estado,
  });
  return `${AUTORIZAR}?${q}`;
}

export type RespostaToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
};

export type Tokens = {
  access: string;
  refresh: string | null;
  expiraEm: Date;
  escopos: string;
};

/**
 * @param agora injetável para o teste não depender do relógio.
 * Desconta 60 segundos: token que vence no meio de uma requisição em voo
 * daria um 401 evitável.
 */
export function lerTokens(r: RespostaToken, agora = new Date()): Tokens | null {
  if (!r.access_token) return null;
  const segundos = r.expires_in ?? 3600;
  return {
    access: r.access_token,
    refresh: r.refresh_token ?? null,
    expiraEm: new Date(agora.getTime() + (segundos - 60) * 1000),
    escopos: r.scope ?? "",
  };
}

/** Os desfechos que a tela de Ajustes sabe traduzir. */
export type MotivoRetorno =
  | "ok"
  | "cancelado"
  | "estado-invalido"
  | "sem-refresh"
  | "sem-agenda"
  | "nao-configurado"
  | "erro";

export const AVISO_RETORNO: Record<MotivoRetorno, string> = {
  ok: "Agenda conectada. Suas contas a pagar e a receber já viram compromissos.",
  cancelado: "Você cancelou a conexão com o Google. Nada mudou.",
  "estado-invalido":
    "A conexão expirou no meio do caminho. Tente conectar de novo.",
  "sem-refresh":
    "O Google não devolveu a permissão duradoura. Remova a Ameixa em myaccount.google.com/permissions e conecte de novo.",
  "sem-agenda":
    "Conectamos, mas não deu para criar as agendas no Google. Tente de novo em alguns minutos.",
  "nao-configurado":
    "A conexão com o Google ainda não foi configurada neste app.",
  erro: "Não deu para conectar ao Google Agenda. Tente de novo.",
};
