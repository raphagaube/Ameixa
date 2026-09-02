"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { definirOculto, estaOculto } from "@/lib/privacidade";

/**
 * Liga e desliga o modo privado.
 *
 * Não recarrega nada: quem esconde é o CSS, então basta trocar o atributo
 * no `<html>` e a tela inteira muda no mesmo quadro — inclusive as telas
 * que ainda nem foram abertas.
 */
export function BotaoPrivacidade() {
  const [oculto, setOculto] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    // O servidor não tem localStorage, então o valor real só existe aqui.
    // Inicializar o useState com ele quebraria a hidratação.
    /* eslint-disable react-hooks/set-state-in-effect */
    setOculto(estaOculto());
    setMontado(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const Icone = oculto ? EyeOff : Eye;

  return (
    <button
      type="button"
      onClick={() => setOculto(definirOculto(!oculto))}
      aria-pressed={montado ? oculto : undefined}
      title={oculto ? "Mostrar os valores" : "Ocultar todos os valores"}
      aria-label={oculto ? "Mostrar os valores" : "Ocultar todos os valores"}
      className="grid place-items-center"
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        border: "1px solid var(--ln)",
        background: oculto ? "var(--tint)" : "transparent",
        color: oculto ? "var(--deep)" : "var(--color-text)",
        flexShrink: 0,
      }}
    >
      <Icone size={20} strokeWidth={1.5} aria-hidden />
    </button>
  );
}
