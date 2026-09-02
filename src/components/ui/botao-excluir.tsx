"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/botao";

/**
 * Excluir em dois toques, dizendo o que se perde.
 *
 * Existe porque os botões de excluir do app ficavam logo abaixo do
 * "Salvar", mesma largura e mesma altura, no fim de uma folha rolável —
 * num celular, errar o alvo por meio centímetro apagava o cadastro na
 * hora, sem pergunta e sem desfazer.
 *
 * A confirmação aparece no lugar do botão, e não numa caixa do sistema: o
 * `window.confirm` do Android abre no topo da tela, longe do polegar, e é
 * fácil de aceitar por reflexo. Aqui o "Sim, excluir" nasce onde estava o
 * botão original, mas o dono já tocou uma vez de propósito.
 */
export function BotaoExcluir({
  rotulo,
  oQueSePerde,
  aoConfirmar,
  carregando,
}: {
  /** Ex.: "Excluir banco" */
  rotulo: string;
  /** O que some junto. Ex.: "O banco e os 2 cartões dele." */
  oQueSePerde: string;
  aoConfirmar: () => void;
  carregando?: boolean;
}) {
  const [perguntando, setPerguntando] = useState(false);

  if (!perguntando) {
    return (
      <Botao
        variante="contorno"
        onClick={() => setPerguntando(true)}
        disabled={carregando}
        style={{ color: "var(--bad)", borderColor: "var(--bad)" }}
      >
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <Trash2 size={18} strokeWidth={1.5} aria-hidden />
          {rotulo}
        </span>
      </Botao>
    );
  }

  return (
    <div
      role="group"
      aria-label={rotulo}
      className="flex flex-col"
      style={{
        gap: 10,
        padding: 14,
        borderRadius: "var(--rs)",
        border: "1px solid var(--bad)",
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600 }}>Tem certeza?</p>
      <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
        {oQueSePerde} Não dá para desfazer.
      </p>
      <div className="flex" style={{ gap: 8 }}>
        <Botao
          variante="contorno"
          onClick={() => setPerguntando(false)}
          disabled={carregando}
        >
          Cancelar
        </Botao>
        <Botao
          onClick={aoConfirmar}
          carregando={carregando}
          style={{ background: "var(--bad)", color: "#fff", border: "none" }}
        >
          Sim, excluir
        </Botao>
      </div>
    </div>
  );
}
