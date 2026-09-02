import "server-only";

import { urlDeRetorno } from "./oauth";

/**
 * As três variáveis que o dono cadastra na Vercel.
 *
 * `URL_SITE` existe porque o Google compara o `redirect_uri` byte a byte e
 * não aceita curinga. Deduzir a origem da requisição — como o callback do
 * Supabase faz — funcionaria em produção e quebraria em todo deploy de
 * preview, com um erro do Google difícil de ligar à causa. Melhor exigir o
 * endereço e falhar claro.
 */
export type ConfigAgenda = {
  clientId: string;
  clientSecret: string;
  urlDoSite: string;
  urlDeRetorno: string;
};

export function configAgenda(): ConfigAgenda | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const urlDoSite =
    process.env.URL_SITE ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined);

  if (!clientId || !clientSecret || !urlDoSite) return null;
  if (!process.env.AGENDA_CHAVE) return null;

  return {
    clientId,
    clientSecret,
    urlDoSite,
    urlDeRetorno: urlDeRetorno(urlDoSite),
  };
}

/** Para a tela dizer "falta configurar" em vez de dar erro sem explicação. */
export function agendaConfigurada(): boolean {
  return configAgenda() !== null;
}
