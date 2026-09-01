"use client";

import { CreditCard, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { Botao } from "@/components/ui/botao";
import { type Cartao, type Conta, meiosDaConta, ROTULO_TIPO_CONTA } from "@/lib/tipos/contas";
import { moeda } from "@/lib/formato";
import { FolhaCartao } from "./folha-cartao";
import { FolhaConta } from "./folha-conta";

export function PainelCartoes({ contas }: { contas: Conta[] }) {
  const router = useRouter();
  const [conta, setConta] = useState<Conta | "nova" | null>(null);
  const [cartao, setCartao] = useState<Cartao | "novo" | null>(null);

  const cartoes = contas.flatMap((c) =>
    c.cartoes.map((k) => ({ ...k, banco: c.nome })),
  );

  function fechar(salvou: boolean) {
    setConta(null);
    setCartao(null);
    if (salvou) router.refresh();
  }

  return (
    <div className="flex flex-col" style={{ gap: 22 }}>
      <CabecalhoVoltar titulo="Cartões e contas" />

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Cartões de crédito</h2>

        {cartoes.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--mut)" }}>
            Nenhum cartão cadastrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: 12 }}>
            {cartoes.map((k) => (
              <li
                key={k.id}
                className="overflow-hidden"
                style={{ borderRadius: "var(--r)", border: "1px solid var(--ln2)" }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ gap: 10, background: k.cor, padding: "12px 14px" }}
                >
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
                      {k.nome}
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,.82)" }}>
                      {k.bandeira}
                      {k.final ? ` · final ${k.final}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCartao(k)}
                    style={{
                      minHeight: 32,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#ffffff",
                      background: "rgba(0,0,0,.24)",
                      borderRadius: 999,
                      padding: "5px 12px",
                    }}
                  >
                    Editar
                  </button>
                </div>

                <div style={{ background: "var(--sf)", padding: "13px 14px" }}>
                  <p style={{ fontSize: 12, color: "var(--mut)" }}>{k.banco}</p>
                  <div className="grid grid-cols-3" style={{ gap: 10, marginTop: 10 }}>
                    <div>
                      <p className="rotulo">Fechamento</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>dia {k.dia_fechamento}</p>
                    </div>
                    <div>
                      <p className="rotulo">Vencimento</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>dia {k.dia_vencimento}</p>
                    </div>
                    <div>
                      <p className="rotulo">Limite</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{moeda(k.limite)}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Botao
          variante="contorno"
          onClick={() => setCartao("novo")}
          disabled={contas.length === 0}
        >
          <span className="flex items-center justify-center" style={{ gap: 8 }}>
            <CreditCard size={18} strokeWidth={1.5} aria-hidden />
            Adicionar cartão de crédito
          </span>
        </Botao>
        {contas.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--mut)" }}>
            Cadastre um banco primeiro — todo cartão pertence a um.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Bancos e carteiras</h2>

        {contas.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--mut)" }}>
            Nenhum banco cadastrado. Comece pelo que você mais usa.
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: 12 }}>
            {contas.map((c) => (
              <li
                key={c.id}
                style={{
                  borderRadius: "var(--r)",
                  border: "1px solid var(--ln2)",
                  background: "var(--sf)",
                  padding: "13px 14px",
                }}
              >
                <div className="flex items-start justify-between" style={{ gap: 10 }}>
                  <span
                    style={{
                      background: c.cor,
                      color: "#ffffff",
                      borderRadius: 999,
                      padding: "4px 12px",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {c.nome}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConta(c)}
                    style={{
                      minHeight: 32,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--deep)",
                      background: "transparent",
                    }}
                  >
                    Editar
                  </button>
                </div>

                <p style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                  {moeda(c.saldo_inicial)}
                </p>
                <p style={{ fontSize: 12, color: "var(--mut)" }}>
                  {ROTULO_TIPO_CONTA[c.tipo]}
                  {c.varias ? ` · ${c.qtd_contas} contas` : ""}
                </p>

                <ul className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
                  {meiosDaConta(c).map((m) => (
                    <li
                      key={m}
                      style={{
                        fontSize: 12,
                        color: "var(--mut)",
                        border: "1px solid var(--ln)",
                        borderRadius: 999,
                        padding: "3px 10px",
                      }}
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        <Botao variante="contorno" onClick={() => setConta("nova")}>
          <span className="flex items-center justify-center" style={{ gap: 8 }}>
            <Landmark size={18} strokeWidth={1.5} aria-hidden />
            Adicionar banco
          </span>
        </Botao>
      </section>

      {conta ? (
        <FolhaConta conta={conta === "nova" ? null : conta} aoFechar={fechar} />
      ) : null}

      {cartao ? (
        <FolhaCartao
          cartao={cartao === "novo" ? null : cartao}
          contas={contas}
          aoFechar={fechar}
        />
      ) : null}
    </div>
  );
}
