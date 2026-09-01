"use client";

import { BarraProgresso } from "@/components/ui/barra-progresso";
import { dataBr, moeda } from "@/lib/formato";
import {
  COR_LIMITE,
  estadoDoLimite,
  percentualDoLimite,
} from "@/lib/fatura";
import type { Fatura } from "@/lib/dados/faturas";

/** Fatura aberta de um cartão, com o ciclo real e a lista de compras. */
export function CartaoFatura({
  fatura,
  totalDespesasDoMes,
  aoEditar,
}: {
  fatura: Fatura;
  totalDespesasDoMes: number;
  aoEditar: () => void;
}) {
  const { cartao: k, ciclo, total, compras, banco } = fatura;
  const estado = estadoDoLimite(total, k.limite);
  const pct = percentualDoLimite(total, k.limite);
  const disponivel = Math.max(k.limite - total, 0);

  const fatiaDasDespesas =
    totalDespesasDoMes > 0 ? Math.round((total / totalDespesasDoMes) * 100) : 0;

  return (
    <li
      className="overflow-hidden"
      style={{ borderRadius: "var(--r)", border: "1px solid var(--ln2)" }}
    >
      <div
        className="flex items-center justify-between"
        style={{ gap: 10, background: k.cor, padding: "12px 14px" }}
      >
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
            {k.nome}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.82)" }}>
            {banco} · {k.bandeira}
            {k.final ? ` · final ${k.final}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={aoEditar}
          style={{
            minHeight: 32,
            fontSize: 13,
            fontWeight: 600,
            color: "#ffffff",
            background: "rgba(0,0,0,.24)",
            borderRadius: 999,
            padding: "5px 12px",
            flexShrink: 0,
          }}
        >
          Editar
        </button>
      </div>

      <div style={{ background: "var(--sf)", padding: "13px 14px" }}>
        <p className="rotulo">Fatura aberta</p>
        <p style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}>
          {moeda(total)}
        </p>
        {fatiaDasDespesas > 0 ? (
          <p style={{ fontSize: 12, color: "var(--mut)" }}>
            {fatiaDasDespesas}% das suas despesas do mês
          </p>
        ) : null}

        <div className="grid grid-cols-3" style={{ gap: 10, marginTop: 12 }}>
          <div>
            <p className="rotulo">Fechamento</p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{dataBr(ciclo.ate)}</p>
          </div>
          <div>
            <p className="rotulo">Vencimento</p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{dataBr(ciclo.vencimento)}</p>
          </div>
          <div>
            <p className="rotulo">Limite</p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{moeda(k.limite)}</p>
          </div>
        </div>

        {k.limite > 0 ? (
          <>
            <div style={{ marginTop: 10 }}>
              <BarraProgresso
                percentual={pct}
                altura={6}
                cor={COR_LIMITE[estado]}
                rotulo={`Uso do limite do ${k.nome}`}
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>
              {pct}% usado · {moeda(disponivel)} disponível
            </p>
          </>
        ) : null}

        {compras.length > 0 ? (
          <ul
            className="flex flex-col"
            style={{ gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--ln2)" }}
          >
            {compras.map((c) => (
              <li key={c.id} className="flex items-center" style={{ gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: c.cor,
                    flexShrink: 0,
                  }}
                />
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: 13 }}>
                  {c.descricao}
                </span>
                <span style={{ fontSize: 12, color: "var(--mut)", flexShrink: 0 }}>
                  {dataBr(c.data)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {moeda(c.valor)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 12 }}>
            Nenhuma compra nesta fatura ainda.
          </p>
        )}
      </div>
    </li>
  );
}
