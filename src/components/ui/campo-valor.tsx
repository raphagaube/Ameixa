"use client";

import { useId } from "react";

/**
 * Campo de dinheiro.
 *
 * Armadilha nº 3 do handoff: o campo guarda TEXTO CRU e só normaliza no
 * salvar. Converter para número a cada tecla trava o apagar — o usuário
 * apaga a vírgula e o valor se reescreve sozinho.
 */
export function CampoValor({
  rotulo,
  valor,
  aoMudar,
  erro,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  erro?: string;
}) {
  const id = useId();

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <div
        className="flex items-center"
        style={{
          borderRadius: "var(--rs)",
          border: `1px solid ${erro ? "var(--bad)" : "var(--ln)"}`,
          background: "var(--sf)",
          paddingLeft: 12,
        }}
      >
        <span style={{ fontSize: 15, color: "var(--mut)" }}>R$</span>
        <input
          id={id}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          aria-invalid={erro ? true : undefined}
          style={{
            flex: 1,
            padding: 12,
            fontSize: 15,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--color-text)",
          }}
        />
      </div>
      {erro ? (
        <p role="alert" style={{ fontSize: 12, color: "var(--bad)" }}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}
