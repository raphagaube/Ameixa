/**
 * Converte um link de Planilhas Google no endereço que devolve CSV.
 *
 * Aceita as três formas que o usuário pode colar:
 * - link normal de edição:      /spreadsheets/d/{ID}/edit#gid=0
 * - link de "publicar na web":  /spreadsheets/d/e/{ID}/pubhtml
 * - link já de exportação:      /spreadsheets/d/{ID}/export?format=csv
 */

export type ResultadoLink =
  | { ok: true; url: string }
  | { ok: false; erro: string };

export function linkParaCsv(bruto: string): ResultadoLink {
  const texto = bruto.trim();

  if (!texto) {
    return { ok: false, erro: "Cole o link da planilha." };
  }

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return { ok: false, erro: "Isso não parece um link. Copie o endereço completo da planilha." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, erro: "O link precisa começar com https://" };
  }

  if (url.hostname !== "docs.google.com") {
    return {
      ok: false,
      erro: "Só aceito link do Planilhas Google (docs.google.com).",
    };
  }

  // A aba escolhida vem no gid, às vezes depois do # em vez do ?.
  const gid =
    url.searchParams.get("gid") ??
    url.hash.match(/gid=(\d+)/)?.[1] ??
    null;

  // Planilha publicada na web: /d/e/{ID}/pubhtml
  const publicada = url.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)/);
  if (publicada) {
    const base = `https://docs.google.com/spreadsheets/d/e/${publicada[1]}/pub?output=csv`;
    return { ok: true, url: gid ? `${base}&gid=${gid}` : base };
  }

  // Planilha normal: /d/{ID}/...
  const normal = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (normal) {
    const base = `https://docs.google.com/spreadsheets/d/${normal[1]}/export?format=csv`;
    return { ok: true, url: gid ? `${base}&gid=${gid}` : base };
  }

  return {
    ok: false,
    erro: "Não achei o código da planilha nesse link. Use o link que aparece na barra do navegador com a planilha aberta.",
  };
}

/**
 * O Google devolve uma página de login em HTML quando a planilha é privada,
 * com status 200. Sem essa checagem, o erro apareceria como "nenhuma linha
 * encontrada", que não ajuda ninguém.
 */
export function pareceHtml(conteudo: string): boolean {
  const inicio = conteudo.slice(0, 400).toLowerCase();
  return (
    inicio.includes("<!doctype html") ||
    inicio.includes("<html") ||
    inicio.includes("<head")
  );
}
