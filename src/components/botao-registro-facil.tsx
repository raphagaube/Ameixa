"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

const ALTURA_ABAS = 56;
const RESPIRO = 16;

/**
 * Botão flutuante "Registro fácil". Fica acima da barra de abas e aparece em
 * todas as telas do app.
 *
 * Acompanha o teclado do celular. Um elemento fixo posicionado pelo rodapé
 * some atrás do teclado no iPhone e salta para o meio da tela em parte dos
 * Android, porque a janela visível encolhe mas a do documento não. Seguir a
 * visualViewport mantém o botão sempre visível, logo acima do teclado —
 * melhor do que escondê-lo, que era o que eu fazia antes.
 */
export function BotaoRegistroFacil({ onClick }: { onClick?: () => void }) {
  const [alturaTeclado, setAlturaTeclado] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const medir = () => {
      // O que sobra entre a janela do documento e a parte visível é o
      // teclado (ou a barra do navegador se retraindo).
      const escondido = window.innerHeight - vv.height - vv.offsetTop;
      // Abaixo de 120px é a barra do navegador, não teclado.
      setAlturaTeclado(escondido > 120 ? escondido : 0);
    };

    medir();
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, []);

  const comTeclado = alturaTeclado > 0;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{
        // Com o teclado aberto a barra de abas fica escondida atrás dele,
        // então o botão não precisa reservar espaço para ela.
        bottom: comTeclado
          ? `${alturaTeclado + RESPIRO}px`
          : `calc(${ALTURA_ABAS}px + env(safe-area-inset-bottom) + ${RESPIRO}px)`,
        transition: "bottom 140ms ease-out",
      }}
    >
      <div
        className="pointer-events-auto flex w-full justify-end px-4"
        style={{ maxWidth: "var(--largura)" }}
      >
        <button
          type="button"
          onClick={onClick}
          aria-label="Registro fácil — lançar um valor rápido"
          className="flex items-center gap-2 rounded-full shadow-lg"
          style={{
            background: "var(--deep)",
            color: "var(--on-ac)",
            height: comTeclado ? 44 : 52,
            paddingInline: comTeclado ? 16 : 20,
            fontSize: comTeclado ? 12 : 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            transition: "height 140ms ease-out, padding 140ms ease-out",
          }}
        >
          <Plus size={comTeclado ? 18 : 20} strokeWidth={2} aria-hidden />
          Registro fácil
        </button>
      </div>
    </div>
  );
}
