"use client";

import { forwardRef, useId } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  erro?: string;
};

/**
 * Campo de texto do padrão do handoff: rótulo 11px maiúsculo com
 * letter-spacing largo, input com borda 1px e raio 12px.
 */
export const Campo = forwardRef<HTMLInputElement, Props>(function Campo(
  { rotulo, erro, id, ...resto },
  ref,
) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idErro = `${idCampo}-erro`;

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <label htmlFor={idCampo} className="rotulo">
        {rotulo}
      </label>
      <input
        {...resto}
        id={idCampo}
        ref={ref}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        style={{
          padding: 12,
          fontSize: 15,
          borderRadius: "var(--rs)",
          border: `1px solid ${erro ? "var(--bad)" : "var(--ln)"}`,
          background: "var(--sf)",
          color: "var(--color-text)",
          width: "100%",
        }}
      />
      {erro ? (
        <p id={idErro} role="alert" style={{ fontSize: 12, color: "var(--bad)" }}>
          {erro}
        </p>
      ) : null}
    </div>
  );
});
