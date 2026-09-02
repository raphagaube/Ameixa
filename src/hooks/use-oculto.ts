"use client";

import { useEffect, useState } from "react";
import { estaOculto, EVENTO } from "@/lib/privacidade";

/**
 * O modo privado, para os poucos lugares que precisam saber em JavaScript.
 *
 * Na maioria das telas quem esconde é o CSS, e nada precisa deste gancho.
 * Ele existe para o que o CSS não alcança: o texto de dica do mouse, que
 * vive num atributo, e o relatório, que precisa nascer com "ocultar
 * valores" já marcado.
 *
 * Começa em `false` de propósito: o servidor não tem localStorage, e chutar
 * aqui quebraria a hidratação. Quem se importa com o instante inicial usa o
 * CSS, que já resolveu antes da primeira pintura.
 */
export function useOculto(): boolean {
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    // Leitura única na montagem, como o ProvedorTema faz com o tema: o
    // servidor não tem localStorage, então o valor real só existe aqui.
    // É inicialização, não um laço.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setOculto(estaOculto());
    const ouvir = (e: Event) => setOculto((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, []);

  return oculto;
}
