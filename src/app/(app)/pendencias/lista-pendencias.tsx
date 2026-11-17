"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { excluirLancamento } from "@/app/(app)/lancamentos/acoes";
import { useFormularioLancamento } from "@/components/casca-lancamentos";
import { Botao } from "@/components/ui/botao";
import { dataBr, moeda } from "@/lib/formato";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";
import { Dinheiro } from "@/components/dinheiro";
import { CircleCheck } from "lucide-react";

/** O que falta preencher num lançamento vindo do Registro Fácil. */
function faltando(l: LancamentoNaLista): string[] {
  const f: string[] = [];
  if (!l.categoria_id) f.push("categoria");
  if (!l.conta_id) f.push("conta");
  if (!l.forma_pagamento) f.push("forma de pagamento");
  if (l.descricao === "Gasto rápido" || l.descricao === "Entrada rápida")
    f.push("descrição");
  return f;
}

export function ListaPendencias({ lista }: { lista: LancamentoNaLista[] }) {
  const router = useRouter();
  const { editar } = useFormularioLancamento();
  const [apagando, setApagando] = useState<string | null>(null);
  const [emAcao, iniciar] = useTransition();

  function excluir(id: string) {
    setApagando(id);
    iniciar(async () => {
      await excluirLancamento(id, false);
      setApagando(null);
      router.refresh();
    });
  }

  if (lista.length === 0) {
    return (
      <section className="flex flex-col items-center" style={{ gap: 10, padding: "32px 20px", background: "var(--sf)", border: "1px solid var(--ln2)", borderRadius: "var(--r)", textAlign: "center" }}>
        <CircleCheck size={32} strokeWidth={1.5} style={{ color: "var(--deep)" }} aria-hidden />
        <h2 style={{ fontSize: 20 }}>Tudo em dia</h2>
        <p style={{ fontSize: 14, color: "var(--mut)" }}>Nenhum lançamento para completar.</p>
      </section>
    );
  }

  return (
    <ul className="flex flex-col" style={{ gap: 12 }}>
      {lista.map((l) => (
        <li
          key={l.id}
          style={{
            borderRadius: "var(--r)",
            border: "1px solid var(--ln2)",
            background: "var(--sf)",
            padding: "var(--espaco-cartao)",
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 700 }}>
            {l.tipo === "receita" ? "+" : "−"}
            <Dinheiro>{moeda(l.valor)}</Dinheiro>
          </p>
          <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>
            {dataBr(l.data_registro)}
            {l.conta?.nome ? ` · ${l.conta.nome}` : ""}
          </p>
          <p style={{ fontSize: 14, marginTop: 6 }}>{l.descricao}</p>

          <ul className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
            {faltando(l).map((f) => (
              <li
                key={f}
                style={{
                  fontSize: 12,
                  color: "var(--mut)",
                  border: "1px dashed var(--ln)",
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                falta {f}
              </li>
            ))}
          </ul>

          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <Botao onClick={() => editar(l)} disabled={emAcao}>
              Completar
            </Botao>
            <Botao
              variante="contorno"
              onClick={() => excluir(l.id)}
              carregando={emAcao && apagando === l.id}
              style={{ color: "var(--bad)", borderColor: "var(--bad)" }}
            >
              Excluir
            </Botao>
          </div>
        </li>
      ))}
    </ul>
  );
}
