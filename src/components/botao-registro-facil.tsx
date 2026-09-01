"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Botão flutuante "Registro fácil". Fica acima da barra de abas e aparece em
 * todas as telas do app.
 *
 * Some enquanto um campo está em foco: por ser fixo na tela, ele cobria
 * botões de formulário logo abaixo — foi assim que o "Salvar nome" dos
 * Ajustes ficou invisível. Some também quando o teclado do celular sobe.
 */
export function BotaoRegistroFacil({ onClick }: { onClick?: () => void }) {
  const [digitando, setDigitando] = useState(false);

  useEffect(() => {
    const ehCampo = (alvo: EventTarget | null) => {
      const el = alvo as HTMLElement | null;
      if (!el?.tagName) return false;
      const t = el.tagName.toLowerCase();
      return (
        t === "input" ||
        t === "textarea" ||
        t === "select" ||
        el.isContentEditable
      );
    };

    const aoFocar = (e: FocusEvent) => {
      if (ehCampo(e.target)) setDigitando(true);
    };
    const aoDesfocar = (e: FocusEvent) => {
      if (ehCampo(e.target)) setDigitando(false);
    };

    document.addEventListener("focusin", aoFocar);
    document.addEventListener("focusout", aoDesfocar);
    return () => {
      document.removeEventListener("focusin", aoFocar);
      document.removeEventListener("focusout", aoDesfocar);
    };
  }, []);

  if (digitando) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 16px)" }}
    >
      <div
        className="pointer-events-auto flex w-full justify-end px-4"
        style={{ maxWidth: "var(--largura)" }}
      >
        <button
          type="button"
          onClick={onClick}
          aria-label="Registro fácil — lançar um valor rápido"
          className="flex items-center gap-2 rounded-full px-5 shadow-lg"
          style={{
            background: "var(--deep)",
            color: "var(--on-ac)",
            height: 52,
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".08em",
          }}
        >
          <Plus size={20} strokeWidth={2} aria-hidden />
          Registro fácil
        </button>
      </div>
    </div>
  );
}
