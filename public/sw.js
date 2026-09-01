/**
 * Service worker da Ameixa.
 *
 * Existe por dois motivos:
 * 1. O Chrome só oferece "instalar app" para sites que registram um service
 *    worker com tratador de fetch. Sem isto, o máximo que aparece é um
 *    atalho comum.
 * 2. Dar uma tela decente quando o celular está sem internet, em vez do
 *    dinossauro do navegador.
 *
 * NÃO guarda páginas nem dados em cache de propósito: é um app financeiro,
 * e mostrar saldo velho como se fosse atual seria pior do que não mostrar
 * nada. Toda requisição vai para a rede.
 */

const VERSAO = "ameixa-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(VERSAO).then((cache) => cache.addAll([OFFLINE])),
  );
  // Assume o controle sem esperar a aba antiga fechar.
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

self.addEventListener("fetch", (evento) => {
  const req = evento.request;

  // Só navegação ganha rede-primeiro com fallback. O resto passa direto,
  // para nunca servir dado financeiro desatualizado.
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
