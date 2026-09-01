"use client";

import { useId } from "react";
import { nomeMes } from "@/lib/formato";

/**
 * Data em três partes: dia digitado, mês e ano em select.
 * O handoff pede assim em vez de um date picker — no celular é mais rápido
 * e não depende do calendário nativo de cada navegador.
 */
export function CampoData({
  rotulo,
  valor,
  aoMudar,
  opcional,
}: {
  rotulo: string;
  /** aaaa-mm-dd, ou string vazia quando opcional e não preenchido */
  valor: string;
  aoMudar: (iso: string) => void;
  opcional?: boolean;
}) {
  const id = useId();
  const hoje = new Date();

  const [aStr, mStr, dStr] = valor ? valor.split("-") : ["", "", ""];
  const ano = Number(aStr) || hoje.getFullYear();
  const mes = valor ? Number(mStr) - 1 : hoje.getMonth();
  const dia = valor ? Number(dStr) : hoje.getDate();

  const anos = Array.from({ length: 13 }, (_, i) => hoje.getFullYear() - 6 + i);

  function montar(d: number, m: number, a: number) {
    // Dia 31 num mês de 30 escorregaria para o mês seguinte; prende no último.
    const ultimo = new Date(a, m + 1, 0).getDate();
    const diaValido = Math.min(Math.max(d, 1), ultimo);
    aoMudar(
      `${a}-${String(m + 1).padStart(2, "0")}-${String(diaValido).padStart(2, "0")}`,
    );
  }

  const estiloSelect: React.CSSProperties = {
    padding: 12,
    fontSize: 15,
    borderRadius: "var(--rs)",
    border: "1px solid var(--ln)",
    background: "var(--sf)",
    color: "var(--color-text)",
    width: "100%",
  };

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="rotulo">
          {rotulo}
        </label>
        {opcional && valor ? (
          <button
            type="button"
            onClick={() => aoMudar("")}
            style={{
              minHeight: 24,
              fontSize: 12,
              color: "var(--mut)",
              background: "transparent",
            }}
          >
            limpar
          </button>
        ) : null}
      </div>

      {opcional && !valor ? (
        <button
          type="button"
          onClick={() =>
            montar(hoje.getDate(), hoje.getMonth(), hoje.getFullYear())
          }
          style={{
            ...estiloSelect,
            textAlign: "left",
            color: "var(--mut)",
            minHeight: 44,
          }}
        >
          Sem vencimento — toque para definir
        </button>
      ) : (
        <div
          className="grid"
          style={{ gridTemplateColumns: "72px 1fr 92px", gap: 8 }}
        >
          <input
            id={id}
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            aria-label={`${rotulo} — dia`}
            value={dia}
            onChange={(e) => montar(Number(e.target.value) || 1, mes, ano)}
            style={estiloSelect}
          />
          <select
            aria-label={`${rotulo} — mês`}
            value={mes}
            onChange={(e) => montar(dia, Number(e.target.value), ano)}
            style={estiloSelect}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {nomeMes(i)}
              </option>
            ))}
          </select>
          <select
            aria-label={`${rotulo} — ano`}
            value={ano}
            onChange={(e) => montar(dia, mes, Number(e.target.value))}
            style={estiloSelect}
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
