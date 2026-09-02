import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { PanoramaDasContas } from "@/lib/dados/saldos";
import { dataBr, moeda } from "@/lib/formato";
import { ROTULO_TIPO_CONTA, type TipoConta } from "@/lib/tipos/contas";
import { Dinheiro } from "@/components/dinheiro";

/**
 * "Onde está meu dinheiro" — a resposta para "quanto eu tenho".
 *
 * Fica no Início, e não na tela de Cartões e contas: aquela é de cadastro,
 * onde se entra para criar e editar. Aqui é de consulta.
 */
export function OndeEstaMeuDinheiro({ panorama }: { panorama: PanoramaDasContas }) {
  const { contas, total, guardado, semConta } = panorama;

  if (contas.length === 0) {
    return (
      <section className="flex flex-col" style={{ gap: 8 }}>
        <h2 style={{ fontSize: 17 }}>Onde está meu dinheiro</h2>
        <p style={{ fontSize: 14, color: "var(--mut)" }}>
          Cadastre seus bancos para ver o saldo de cada um.
        </p>
        <Link
          href="/cartoes"
          style={{ fontSize: 13, color: "var(--deep)", fontWeight: 600 }}
        >
          Cadastrar banco
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col" style={{ gap: 12 }}>
      <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
        <h2 style={{ fontSize: 17 }}>Onde está meu dinheiro</h2>
        <Link
          href="/cartoes"
          style={{ fontSize: 13, color: "var(--deep)", fontWeight: 600 }}
        >
          gerenciar
        </Link>
      </div>

      {/* Total e guardado em campos separados: são perguntas diferentes.
          O total diz quanto existe; o guardado diz quanto não é para gastar. */}
      <div className="grid grid-cols-2" style={{ gap: 12 }}>
        <div
          style={{
            background: "var(--tint)",
            borderRadius: "var(--r)",
            padding: "13px 14px",
          }}
        >
          <p className="rotulo">Total de tudo</p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.15,
              marginTop: 4,
              color: total < 0 ? "var(--bad)" : "var(--color-text)",
            }}
          >
            <Dinheiro>{moeda(total)}</Dinheiro>
          </p>
          <p style={{ fontSize: 12, color: "var(--mut)" }}>contas e guardado</p>
        </div>

        <div
          style={{
            borderRadius: "var(--r)",
            border: "1px solid var(--ln2)",
            background: "var(--sf)",
            padding: "13px 14px",
          }}
        >
          <p className="rotulo">Guardado</p>
          <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, marginTop: 4 }}>
            <Dinheiro>{moeda(guardado)}</Dinheiro>
          </p>
          <p style={{ fontSize: 12, color: "var(--mut)" }}>investimentos</p>
        </div>
      </div>

      <ul className="celulas">
        {contas.map((c) => {
          const semMovimento = c.entradas === 0 && c.saidas === 0;
          return (
            <li key={c.id} style={{ padding: "12px 14px" }}>
              <div
                className="flex items-baseline justify-between"
                style={{ gap: 8 }}
              >
                <span
                  className="truncate"
                  style={{
                    background: c.cor,
                    color: "#ffffff",
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {c.nome}
                </span>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    flexShrink: 0,
                    color: c.saldo < 0 ? "var(--bad)" : "var(--color-text)",
                  }}
                >
                  <Dinheiro>{moeda(c.saldo)}</Dinheiro>
                </span>
              </div>

              <div
                className="flex items-baseline justify-between"
                style={{ gap: 8, marginTop: 6, fontSize: 12 }}
              >
                <span style={{ color: "var(--mut)" }}>
                  {ROTULO_TIPO_CONTA[c.tipo as TipoConta] ?? c.tipo}
                </span>
                <span style={{ color: "var(--mut)", flexShrink: 0 }}>
                  {c.conferidoEm ? (
                    `conferido em ${dataBr(c.conferidoEm)}`
                  ) : semMovimento ? (
                    <>
                      inicial <Dinheiro>{moeda(c.saldoInicial)}</Dinheiro> · sem
                      movimento
                    </>
                  ) : (
                    <>
                      <span style={{ color: "var(--ok)" }}>
                        +<Dinheiro>{moeda(c.entradas)}</Dinheiro>
                      </span>
                      {" · "}
                      <span style={{ color: "var(--bad)" }}>
                        −<Dinheiro>{moeda(c.saidas)}</Dinheiro>
                      </span>
                    </>
                  )}
                </span>
              </div>

              {c.conferidoEm && c.ignorados > 0 ? (
                <p style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  {c.ignorados} lançamento{c.ignorados > 1 ? "s" : ""} anterior
                  {c.ignorados > 1 ? "es" : ""} ficaram fora deste saldo
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Sem este aviso, o total daqui não bateria com o saldo do painel e a
          diferença ficaria sem explicação. */}
      {Math.abs(semConta) >= 0.01 ? (
        <Link
          href="/extrato"
          className="flex items-start"
          style={{
            gap: 10,
            borderRadius: "var(--r)",
            border: "1px solid var(--warn)",
            padding: "12px 14px",
            color: "var(--color-text)",
          }}
        >
          <TriangleAlert
            size={18}
            strokeWidth={1.5}
            style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }}
            aria-hidden
          />
          <span>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
              <Dinheiro>{moeda(Math.abs(semConta))}</Dinheiro> em lançamentos sem conta escolhida
            </span>
            <span style={{ display: "block", fontSize: 12, color: "var(--mut)" }}>
              Por isso o total daqui pode não bater com o saldo do painel.
            </span>
          </span>
        </Link>
      ) : null}
    </section>
  );
}
