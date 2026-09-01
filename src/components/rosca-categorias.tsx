"use client";

import { moeda } from "@/lib/formato";
import { gradienteDaRosca, type Fatia } from "@/lib/relatorio";

/**
 * Rosca de 186px com furo de 118px, montada com conic-gradient.
 *
 * A legenda traz nome, valor e percentual de cada fatia. Isso não é enfeite:
 * as cores vêm das categorias que o usuário escolheu, então não há garantia
 * de contraste entre elas — a legenda é o que impede a identidade de depender
 * só da cor.
 */
export function RoscaCategorias({
  fatias,
  total,
  legendaTopo,
}: {
  fatias: Fatia[];
  total: number;
  legendaTopo?: string;
}) {
  if (fatias.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--mut)", padding: "16px 0" }}>
        Nenhuma despesa neste período.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center" style={{ gap: 16 }}>
      <div
        className="relative grid place-items-center"
        style={{ width: 186, height: 186 }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: gradienteDaRosca(fatias),
          }}
        />
        <div
          className="relative grid place-items-center text-center"
          style={{
            width: 118,
            height: 118,
            borderRadius: "50%",
            background: "var(--color-bg)",
          }}
        >
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>
              {moeda(total)}
            </p>
            {legendaTopo ? (
              <p style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                {legendaTopo}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="w-full flex flex-col" style={{ gap: 8 }}>
        {fatias.map((f) => (
          <li key={f.nome} className="flex items-center" style={{ gap: 8 }}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: f.cor,
                flexShrink: 0,
              }}
            />
            <span className="min-w-0 flex-1 truncate" style={{ fontSize: 14 }}>
              {f.nome}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{moeda(f.valor)}</span>
            <span
              style={{
                fontSize: 12,
                color: "var(--mut)",
                width: 46,
                textAlign: "right",
              }}
            >
              {f.percentual}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
