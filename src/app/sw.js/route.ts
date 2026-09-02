/**
 * Service worker servido por rota, não como arquivo estático.
 *
 * O motivo é o número da versão. O navegador só troca de service worker
 * quando o arquivo muda byte a byte; um sw.js fixo em public/ é idêntico em
 * toda publicação, então o app instalado ficaria preso numa versão antiga
 * para sempre. Injetando o identificador da publicação, cada deploy gera um
 * arquivo diferente e a troca acontece sozinha.
 */

export const dynamic = "force-dynamic";

function versao(): string {
  return (
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "desenvolvimento"
  );
}

export function GET() {
  const codigo = `
// Gerado automaticamente. Versão: ${versao()}
const VERSAO = ${JSON.stringify(`ameixa-${versao()}`)};
const OFFLINE = "/offline.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((c) => c.addAll([OFFLINE])));
  // Assume na hora, sem esperar a aba antiga fechar.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data === "assumir") self.skipWaiting();
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;

  // Só navegação. O resto passa direto: é um app financeiro, e servir um
  // saldo de ontem como se fosse o de agora seria pior do que não servir.
  if (req.mode !== "navigate") return;

  evento.respondWith(
    fetch(req).catch(async () => {
      const cache = await caches.open(VERSAO);
      const resposta = await cache.match(OFFLINE);
      return (
        resposta ??
        new Response("Sem conexão.", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
`.trim();

  return new Response(codigo, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "service-worker-allowed": "/",
      // Nunca guardar: é este arquivo que carrega o número da versão.
      "cache-control": "no-store, must-revalidate",
    },
  });
}
