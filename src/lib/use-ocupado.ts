"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Sinal de "ocupado" para trabalhos longos — no lugar de useTransition.
 *
 * O React junta todas as transições em andamento: enquanto uma transição
 * assíncrona espera, nenhuma outra chega à tela. E trocar de tela no Next é
 * uma transição. Aplicar uma planilha ou levar a fila ao Google Agenda leva
 * de segundos a minutos; com useTransition os menus ficavam mortos esse tempo
 * todo, e o toque parecia ignorado. Aqui é só um estado: quem quiser sair da
 * tela sai, e o trabalho segue até o fim.
 */
export function useOcupado(): [boolean, (trabalho: () => Promise<void>) => void] {
  const [ocupado, setOcupado] = useState(false);
  const emCurso = useRef(0);

  const rodar = useCallback((trabalho: () => Promise<void>) => {
    emCurso.current += 1;
    setOcupado(true);
    void trabalho().finally(() => {
      emCurso.current -= 1;
      if (emCurso.current === 0) setOcupado(false);
    });
  }, []);

  return [ocupado, rodar];
}
