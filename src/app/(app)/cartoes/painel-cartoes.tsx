"use client";

import { CreditCard, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { CartaoFatura } from "@/components/cartao-fatura";
import { SeletorMes } from "@/components/seletor-mes";
import { Botao } from "@/components/ui/botao";
import { type Cartao, type Conta, meiosDaConta, ROTULO_TIPO_CONTA } from "@/lib/tipos/contas";
import { moeda } from "@/lib/formato";
import type { Fatura } from "@/lib/dados/faturas";
import type { ContaComSaldo } from "@/lib/saldo-conta";
import { FolhaCartao } from "./folha-cartao";
import { FolhaConta } from "./folha-conta";
import { Dinheiro } from "@/components/dinheiro";

export function PainelCartoes({
  contas,
  faturas,
  totalDespesasDoMes,
  saldos,
  ano,
  mes,
}: {
  contas: Conta[];
  faturas: Fatura[];
  totalDespesasDoMes: number;
  saldos: ContaComSaldo[];
  ano: number;
  mes: number;
}) {
  const router = useRouter();
  const [conta, setConta] = useState<Conta | "nova" | null>(null);
  const [cartao, setCartao] = useState<Cartao | "novo" | null>(null);

  // O saldo real de cada conta: o cadastrado mais o que se movimentou nela.
  // Mostrar só o cadastrado fazia esta tela mentir.
  const saldoDe = new Map(saldos.map((s) => [s.id, s]));

  function fechar(salvou: boolean) {
    setConta(null);
    setCartao(null);
    if (salvou) router.refresh();
  }

  return (
    <div className="flex flex-col" style={{ gap: 22 }}>
      <CabecalhoVoltar titulo="Cartões e contas" />

      <SeletorMes ano={ano} mes={mes} />

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Faturas do mês</h2>

        {faturas.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--mut)" }}>
            Nenhum cartão cadastrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: 12 }}>
            {faturas.map((f) => (
              <CartaoFatura
                key={f.cartao.id}
                fatura={f}
                totalDespesasDoMes={totalDespesasDoMes}
                aoEditar={() => setCartao(f.cartao)}
              />
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

                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginTop: 8,
                    color:
                      (saldoDe.get(c.id)?.saldo ?? c.saldo_inicial) < 0
                        ? "var(--bad)"
                        : undefined,
                  }}
                >
                  <Dinheiro>{moeda(saldoDe.get(c.id)?.saldo ?? c.saldo_inicial)}</Dinheiro>
                </p>
                <p style={{ fontSize: 12, color: "var(--mut)" }}>
                  {ROTULO_TIPO_CONTA[c.tipo]}
                  {c.varias ? ` · ${c.qtd_contas} contas` : ""}
                  {" · inicial "}
                  <Dinheiro>{moeda(c.saldo_inicial)}</Dinheiro>
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
