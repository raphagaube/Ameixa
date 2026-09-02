"use client";

import { useOculto } from "@/hooks/use-oculto";
import { moeda, moedaCurta } from "@/lib/formato";
import { alturaDaBarra, type MesMovimento } from "@/lib/relatorio";
import { Dinheiro } from "@/components/dinheiro";

/**
 * Receitas × despesas nos últimos 6 meses.
 *
 * Duas séries com legenda sempre presente e a tabela logo abaixo — quem não
 * distingue verde de vermelho lê os números.
 */
export function BarrasEvolucao({ meses }: { meses: MesMovimento[] }) {
  // A dica que aparece ao passar o mouse fica num atributo, onde o CSS do
  // modo privado não chega — daí precisar saber disto em JavaScript.
  const oculto = useOculto();
  const maximo = Math.max(
    ...meses.map((m) => Math.max(m.receitas, m.despesas)),
    0,
  );

  if (maximo <= 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--mut)", padding: "16px 0" }}>
        Sem movimento nos últimos meses.
      </p>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <ul className="flex" style={{ gap: 14 }}>
        <li className="flex items-center" style={{ gap: 6 }}>
          <span
            aria-hidden
            style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ok)" }}
          />
          <span style={{ fontSize: 12, color: "var(--mut)" }}>Receitas</span>
        </li>
        <li className="flex items-center" style={{ gap: 6 }}>
          <span
            aria-hidden
            style={{ width: 10, height: 10, borderRadius: 3, background: "var(--bad)" }}
          />
          <span style={{ fontSize: 12, color: "var(--mut)" }}>Despesas</span>
        </li>
      </ul>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${meses.length}, 1fr)`, gap: 8 }}>
        {meses.map((m) => (
          <div key={m.mes} className="flex flex-col items-center" style={{ gap: 6 }}>
            <div
              className="flex w-full items-end justify-center"
              style={{ height: 96, gap: 3 }}
            >
              <div
                title={oculto ? "Receitas" : `Receitas: ${moeda(m.receitas)}`}
                style={{
                  flex: 1,
                  maxWidth: 14,
                  height: `${alturaDaBarra(m.receitas, maximo)}%`,
                  background: "var(--ok)",
                  borderRadius: "4px 4px 0 0",
                }}
              />
              <div
                title={oculto ? "Despesas" : `Despesas: ${moeda(m.despesas)}`}
                style={{
                  flex: 1,
                  maxWidth: 14,
                  height: `${alturaDaBarra(m.despesas, maximo)}%`,
                  background: "var(--bad)",
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: "var(--mut)" }}>{m.rotulo}</span>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--mut)", textAlign: "left" }}>
              <th style={{ padding: "6px 4px", fontWeight: 600 }}>Mês</th>
              <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>
                Receitas
              </th>
              <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>
                Despesas
              </th>
              <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>
                Saldo
              </th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => {
              const saldo = m.receitas - m.despesas;
              return (
                <tr key={m.mes} style={{ borderTop: "1px solid var(--ln2)" }}>
                  <td style={{ padding: "6px 4px" }}>{m.rotulo}</td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    <Dinheiro>{moedaCurta(m.receitas)}</Dinheiro>
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    <Dinheiro>{moedaCurta(m.despesas)}</Dinheiro>
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: saldo < 0 ? "var(--bad)" : "var(--ok)",
                    }}
                  >
                    {saldo < 0 ? "−" : ""}
                    <Dinheiro>{moedaCurta(Math.abs(saldo))}</Dinheiro>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
