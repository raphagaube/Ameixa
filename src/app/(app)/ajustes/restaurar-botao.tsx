"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/botao";
import { esquecerPosicao } from "@/lib/posicao-flutuante";

/**
 * Devolve o botão "Registro fácil" ao canto de origem.
 *
 * A posição é gravada quando o dono arrasta, e não havia como desfazer:
 * largar a pílula no meio da tela a deixava permanentemente por cima da
 * lista do Início, e a única saída era arrastar de novo adivinhando o
 * lugar certo.
 */
export function RestaurarBotao() {
  const [feito, setFeito] = useState(false);

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <Botao
        variante="contorno"
        onClick={() => {
          esquecerPosicao();
          setFeito(true);
          // Recarrega para o botão nascer no canto: a posição é lida uma
          // vez, na montagem.
          window.location.reload();
        }}
      >
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <RotateCcw size={18} strokeWidth={1.5} aria-hidden />
          Devolver o botão + ao canto
        </span>
      </Botao>
      {feito ? (
        <p aria-live="polite" style={{ fontSize: 12, color: "var(--mut)" }}>
          Pronto.
        </p>
      ) : null}
    </div>
  );
}
