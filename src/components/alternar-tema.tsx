"use client";

import { Moon, Sun } from "lucide-react";
import { useTema } from "@/components/provedor-tema";

export function AlternarTema() {
  const { modo, alternarModo } = useTema();
  const paraEscuro = modo === "light";

  return (
    <button
      type="button"
      onClick={alternarModo}
      aria-label={paraEscuro ? "Mudar para tema escuro" : "Mudar para tema claro"}
      className="grid place-items-center rounded-xl border"
      style={{
        width: 38,
        height: 38,
        minHeight: 38,
        borderColor: "var(--ln)",
        color: "var(--color-text)",
        background: "var(--sf)",
      }}
    >
      {paraEscuro ? (
        <Moon size={18} strokeWidth={1.5} aria-hidden />
      ) : (
        <Sun size={18} strokeWidth={1.5} aria-hidden />
      )}
    </button>
  );
}
