"use client";

import { moeda } from "@/lib/formato";
import { gradienteDaRosca, type Fatia } from "@/lib/relatorio";
import { Dinheiro } from "@/components/dinheiro";

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
    <div className="flex flex-col items-center" style={{ gap: 18 }}>
      <div
        className="relative grid place-items-center"
        style={{ width: 250, height: 250 }}
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
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "var(--color-bg)",
          }}
        >
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
              <Dinheiro>{moeda(total)}</Dinheiro>
            </p>
            {legendaTopo ? (
              <p style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                {legendaTopo}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Legenda enxuta: o gráfico é a estrela, ela é o apoio. Antes cada
          fatia ocupava uma linha alta e a lista tomava mais tela que a
          rosca. */}
      <ul className="w-full flex flex-col" style={{ gap: 5 }}>
        {fatias.map((f) => (
          <li key={f.nome} className="flex items-center" style={{ gap: 7 }}>
            <span
              aria-hidden
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                background: f.cor,
                flexShrink: 0,
              }}
            />
            <span className="min-w-0 flex-1 truncate" style={{ fontSize: 13 }}>
              {f.nome}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              <Dinheiro>{moeda(f.valor)}</Dinheiro>
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--mut)",
                width: 38,
                textAlign: "right",
                flexShrink: 0,
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
