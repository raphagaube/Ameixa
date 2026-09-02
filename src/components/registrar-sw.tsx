"use client";

import { useEffect } from "react";

/**
 * Registra o service worker e mantém o app atualizado.
 *
 * Duas responsabilidades:
 * 1. Registrar — é o que faz o Chrome oferecer "instalar app" de verdade.
 * 2. Trocar de versão sozinho. Sem isto, o app instalado continuava numa
 *    versão antiga e o dono precisaria reinstalar a cada publicação, o que
 *    não faz sentido nenhum.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let recarregando = false;

    /**
     * Quando um service worker novo assume, o navegador dispara isto. Uma
     * recarga só — a trava evita o laço infinito clássico de recarregar,
     * assumir de novo, recarregar.
     */
    const aoTrocarControle = () => {
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", aoTrocarControle);

    let registro: ServiceWorkerRegistration | null = null;

    const registrar = async () => {
      try {
        registro = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          // Nunca pegar o próprio sw.js do cache do navegador: é ele que
          // carrega o número da versão, e vindo velho nada nunca atualiza.
          updateViaCache: "none",
        });

        // Procura versão nova assim que o app abre.
        registro.update().catch(() => {});
      } catch {
        // Service worker bloqueado (janela anônima, por exemplo). O app
        // funciona igual, só não fica instalável.
      }
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });

    /**
     * App instalado fica aberto por dias. Sempre que volta ao primeiro
     * plano, checa se saiu versão nova — é o momento em que o usuário está
     * prestes a usar e pode absorver uma recarga.
     */
    const aoVoltar = () => {
      if (document.visibilityState === "visible") {
        registro?.update().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", aoTrocarControle);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("load", registrar);
    };
  }, []);

  return null;
}
