"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { useFormularioLancamento } from "@/components/casca-lancamentos";
import { dataBr, moeda } from "@/lib/formato";
import {
  dataQueVale,
  ROTULO_SITUACAO,
  type LancamentoNaLista,
} from "@/lib/tipos/lancamentos";
import { Dinheiro } from "@/components/dinheiro";

/**
 * Uma linha da lista do extrato. Clicar abre o formulário de edição.
 *
 * Em modo de seleção o clique passa a marcar e desmarcar em vez de abrir o
 * formulário: com a caixa de seleção do lado, tocar na linha inteira é o
 * gesto esperado no celular, e abrir o modal sem querer no meio de uma
 * seleção de trinta itens perderia tudo.
 */
export function LinhaLancamento({
  l,
  mostrarData,
  selecionavel,
  selecionado,
  aoAlternar,
}: {
  l: LancamentoNaLista;
  mostrarData?: boolean;
  selecionavel?: boolean;
  selecionado?: boolean;
  aoAlternar?: (id: string) => void;
}) {
  const { editar } = useFormularioLancamento();

  const ehAporte = l.tipo === "aporte";
  const cor = ehAporte
    ? "var(--chart2)"
    : l.tipo === "receita"
      ? "var(--ok)"
      : "var(--bad)";
  const sinal = ehAporte ? "" : l.tipo === "receita" ? "+" : "−";

  // A data e a situação saem do texto truncado e ganham lugar próprio.
  //
  // Antes tudo ia numa linha só com `truncate`, e num celular a data era a
  // primeira a ser cortada — justamente o que distingue a parcela de
  // outubro da de novembro. Três "Escola Eloah · R$ 2.695,15" ficavam
  // idênticas na tela.
  const meta = [
    l.categoria?.nome,
    l.subcategoria?.nome,
    l.cartao?.nome ?? l.conta?.nome,
  ]
    .filter(Boolean)
    .join(" · ");

  const quando = mostrarData ? dataBr(dataQueVale(l)) : null;
  const pendente =
    l.situacao === "pago" || l.situacao === "recebido"
      ? null
      : ROTULO_SITUACAO[l.situacao];

  return (
    <button
      type="button"
      onClick={() => (selecionavel ? aoAlternar?.(l.id) : editar(l))}
      aria-pressed={selecionavel ? !!selecionado : undefined}
      className="flex w-full items-center text-left"
      style={{
        gap: 10,
        padding: "10px 0",
        background: "transparent",
        color: "var(--color-text)",
        minHeight: 56,
      }}
    >
      {selecionavel ? (
        <span
          aria-hidden
          className="grid place-items-center"
          style={{
            width: 22,
            height: 22,
            flexShrink: 0,
            borderRadius: 6,
            border: `2px solid ${selecionado ? "var(--deep)" : "var(--ln2)"}`,
            background: selecionado ? "var(--deep)" : "transparent",
            color: "var(--on-ac)",
          }}
        >
          {selecionado ? <Check size={14} strokeWidth={3} /> : null}
        </span>
      ) : null}

      <span
        aria-hidden
        className="grid place-items-center"
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 10,
          background: l.categoria?.cor ?? "var(--ln2)",
          color: l.categoria?.cor_texto ?? "var(--mut)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {ehAporte ? (
          <ArrowUpRight size={16} strokeWidth={2} />
        ) : (
          (l.categoria?.nome ?? "?").slice(0, 1).toUpperCase()
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className="block truncate"
          style={{ fontSize: 15, fontWeight: 500 }}
        >
          {l.descricao}
        </span>
        {meta ? (
          <span
            className="block truncate"
            style={{ fontSize: 12, color: "var(--mut)" }}
          >
            {ehAporte ? `guardado · ${meta}` : meta}
          </span>
        ) : null}
        {quando || pendente ? (
          <span
            className="flex items-center"
            style={{ gap: 6, fontSize: 12, color: "var(--mut)" }}
          >
            {quando ? <span style={{ flexShrink: 0 }}>{quando}</span> : null}
            {pendente ? (
              <span
                style={{
                  flexShrink: 0,
                  fontWeight: 600,
                  color: "var(--deep)",
                }}
              >
                {pendente}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>

      <span style={{ fontSize: 16, fontWeight: 600, color: cor, flexShrink: 0 }}>
        {sinal}
        <Dinheiro>{moeda(l.valor)}</Dinheiro>
      </span>
    </button>
  );
}
