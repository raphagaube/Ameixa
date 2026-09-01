"use client";

import { Plus } from "lucide-react";

/**
 * Botão flutuante "Registro fácil". Fica acima da barra de abas e aparece em
 * todas as telas do app.
 */
export function BotaoRegistroFacil({ onClick }: { onClick?: () => void }) {
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
