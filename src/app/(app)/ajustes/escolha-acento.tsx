"use client";

import { useState } from "react";
import { useTema } from "@/components/provedor-tema";
import { ACENTOS } from "@/lib/theme";

const PRESETS = [
  { nome: "Rosa", hex: ACENTOS.rosa },
  { nome: "Azul", hex: ACENTOS.azul },
  { nome: "Verde", hex: ACENTOS.verde },
];

/**
 * Quatro opções de acento: três prontas e "Minha cor", livre.
 * Toda a paleta do app é derivada do hex escolhido aqui.
 */
export function EscolhaAcento({ inicial }: { inicial?: string }) {
  const { acento, definirAcento } = useTema();

  // O acento salvo no perfil já chega como prop, então dá para calcular o
  // valor inicial direto — sem efeito e sem render extra.
  const [personalizada, setPersonalizada] = useState(() => {
    if (!inicial) return "#A9A0D8";
    const ehPreset = PRESETS.some((p) => p.hex.toLowerCase() === inicial.toLowerCase());
    return ehPreset ? "#A9A0D8" : inicial;
  });

  const ehPreset = PRESETS.some((p) => p.hex.toLowerCase() === acento.toLowerCase());

  const caixa = (ativo: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingInline: 12,
    borderRadius: "var(--rs)",
    border: `1px solid ${ativo ? "var(--deep)" : "var(--ln)"}`,
    background: ativo ? "var(--tint)" : "transparent",
    color: "var(--color-text)",
    fontSize: 14,
    fontWeight: ativo ? 700 : 500,
  });

  const bolinha = (hex: string) => (
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        borderRadius: 999,
        background: hex,
        border: "1px solid var(--ln)",
        flexShrink: 0,
      }}
    />
  );

  return (
    <div className="grid grid-cols-2" style={{ gap: 8 }}>
      {PRESETS.map((p) => (
        <button
          key={p.hex}
          type="button"
          onClick={() => definirAcento(p.hex)}
          aria-pressed={acento.toLowerCase() === p.hex.toLowerCase()}
          style={caixa(acento.toLowerCase() === p.hex.toLowerCase())}
        >
          {bolinha(p.hex)}
          {p.nome}
        </button>
      ))}

      <label style={caixa(!ehPreset)}>
        {bolinha(personalizada)}
        Minha cor
        <input
          type="color"
          value={personalizada}
          onChange={(e) => {
            setPersonalizada(e.target.value);
            definirAcento(e.target.value);
          }}
          aria-label="Escolher minha cor de destaque"
          style={{
            width: 1,
            height: 1,
            minHeight: 1,
            opacity: 0,
            position: "absolute",
          }}
        />
      </label>
    </div>
  );
}
