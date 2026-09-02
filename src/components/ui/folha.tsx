"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Folha inferior (bottom sheet). Padrão do handoff: raio 20px no topo,
 * entrada de translateY(14px) para 0 com fade em 180ms, backdrop escuro que
 * fecha ao clique e overscroll contido.
 */
export function Folha({
  aberta,
  aoFechar,
  titulo,
  alturaMaxima = "88vh",
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  alturaMaxima?: string;
  children: React.ReactNode;
}) {
  const painel = useRef<HTMLDivElement>(null);

  /**
   * Guarda a função de fechar numa ref.
   *
   * Quem abre a gaveta passa `() => aoFechar(false)`, que é uma função nova
   * a cada renderização. Com ela na lista de dependências, o efeito rodava a
   * cada tecla digitada — e o `painel.focus()` lá dentro tirava o cursor do
   * campo já na primeira letra. A ref mantém a função sempre atual sem
   * fazer o efeito rodar de novo.
   */
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });

  // Esc fecha, e o fundo trava a rolagem enquanto a folha está aberta.
  // Depende só de `aberta`: roda uma vez ao abrir e desfaz ao fechar.
  useEffect(() => {
    if (!aberta) return;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar.current();
    };
    document.addEventListener("keydown", aoTeclar);

    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    painel.current?.focus();

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagemAnterior;
    };
  }, [aberta]);

  if (!aberta) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,.45)", minHeight: 0 }}
      />

      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className="folha-entra absolute inset-x-0 bottom-0 mx-auto w-full outline-none"
        style={{
          maxWidth: "var(--largura)",
          maxHeight: alturaMaxima,
          overflowY: "auto",
          overscrollBehavior: "contain",
          background: "var(--sf)",
          borderRadius: "var(--rf) var(--rf) 0 0",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        <header
          className="sticky top-0 flex items-center justify-between"
          style={{
            gap: 12,
            padding: "16px 16px 12px",
            background: "var(--sf)",
            borderRadius: "var(--rf) var(--rf) 0 0",
          }}
        >
          <h2 style={{ fontSize: 21 }}>{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid place-items-center rounded-xl"
            style={{
              width: 38,
              height: 38,
              minHeight: 38,
              color: "var(--mut)",
              background: "transparent",
            }}
          >
            <X size={20} strokeWidth={1.5} aria-hidden />
          </button>
        </header>

        <div style={{ padding: "0 16px" }}>{children}</div>
      </div>
    </div>
  );
}
