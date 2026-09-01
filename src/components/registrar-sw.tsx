"use client";

import { useEffect } from "react";

/**
 * Registra o service worker.
 *
 * É o que faz o Chrome oferecer "instalar app" de verdade em vez de só um
 * atalho. Sem isto, o convite que aparece cria um ícone que abre o navegador
 * normal, com barra de endereço e tudo.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Espera a página terminar de carregar: registrar antes disputa banda
    // com o que o usuário está esperando ver.
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Navegador com service worker bloqueado (janela anônima, por
        // exemplo). O app funciona igual, só não fica instalável.
      });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });

    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
