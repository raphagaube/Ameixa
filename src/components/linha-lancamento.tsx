"use client";

import { ArrowUpRight } from "lucide-react";
import { useFormularioLancamento } from "@/components/casca-lancamentos";
import { dataBr, moeda } from "@/lib/formato";
import { ROTULO_SITUACAO, type LancamentoNaLista } from "@/lib/tipos/lancamentos";

/** Uma linha da lista do extrato. Clicar abre o formulário de edição. */
export function LinhaLancamento({
  l,
  mostrarData,
}: {
  l: LancamentoNaLista;
  mostrarData?: boolean;
}) {
  const { editar } = useFormularioLancamento();

  const ehAporte = l.tipo === "aporte";
  const cor = ehAporte
    ? "var(--chart2)"
    : l.tipo === "receita"
      ? "var(--ok)"
      : "var(--bad)";
  const sinal = ehAporte ? "" : l.tipo === "receita" ? "+" : "−";

  const meta = [
    l.categoria?.nome,
    l.subcategoria?.nome,
    l.cartao?.nome ?? l.conta?.nome,
    mostrarData ? dataBr(l.data_registro) : null,
    l.situacao === "pago" || l.situacao === "recebido"
      ? null
      : ROTULO_SITUACAO[l.situacao],
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => editar(l)}
      className="flex w-full items-center text-left"
      style={{
        gap: 10,
        padding: "10px 0",
        background: "transparent",
        color: "var(--color-text)",
        minHeight: 56,
      }}
    >
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
      </span>

      <span style={{ fontSize: 16, fontWeight: 600, color: cor, flexShrink: 0 }}>
        {sinal}
        {moeda(l.valor)}
      </span>
    </button>
  );
}
