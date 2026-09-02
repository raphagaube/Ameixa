"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { excluirLancamento } from "@/app/(app)/lancamentos/acoes";
import { useFormularioLancamento } from "@/components/casca-lancamentos";
import { Botao } from "@/components/ui/botao";
import { dataBr, moeda } from "@/lib/formato";
import { idsParaMesclar, type GrupoRepetido } from "@/lib/repetidos";
import { Dinheiro } from "@/components/dinheiro";

export function PainelRepetidos({
  grupos,
  de,
  ate,
}: {
  grupos: GrupoRepetido[];
  de: string;
  ate: string;
}) {
  const router = useRouter();
  const { editar } = useFormularioLancamento();
  const [paraExcluir, setParaExcluir] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function alternar(id: string) {
    const novo = new Set(paraExcluir);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setParaExcluir(novo);
  }

  function mesclar(g: GrupoRepetido) {
    const novo = new Set(paraExcluir);
    for (const id of idsParaMesclar(g)) novo.add(id);
    setParaExcluir(novo);
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      for (const id of paraExcluir) {
        const r = await excluirLancamento(id, false);
        if (!r.ok) {
          setErro(r.erro);
          return;
        }
      }
      setParaExcluir(new Set());
      router.refresh();
    });
  }

  if (grupos.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--mut)", padding: "24px 0" }}>
        Nenhum lançamento repetido entre {dataBr(de)} e {dataBr(ate)}.
      </p>
    );
  }

  return (
    <>
      <p style={{ fontSize: 13, color: "var(--mut)" }}>
        Lançamentos com o mesmo valor e a mesma descrição. Parcelas e
        assinaturas ficam de fora — série não é duplicata.
      </p>

      <ul className="flex flex-col" style={{ gap: 12, paddingBottom: 80 }}>
        {grupos.map((g) => (
          <li
            key={g.chave}
            style={{
              borderRadius: "var(--r)",
              border: "1px solid var(--ln2)",
              background: "var(--sf)",
              padding: "13px 14px",
            }}
          >
            <div className="flex items-start justify-between" style={{ gap: 8 }}>
              <div className="min-w-0">
                <p className="truncate" style={{ fontSize: 15, fontWeight: 600 }}>
                  {g.descricao}
                </p>
                <p style={{ fontSize: 12, color: "var(--mut)" }}>
                  <Dinheiro>{moeda(g.valor)}</Dinheiro> · {g.ocorrencias.length} vezes
                </p>
              </div>
              {/* Chamava-se "Mesclar", mas nada é combinado: as repetições
                  além da primeira são marcadas para exclusão. Quem lia
                  "mesclar" esperava juntar em um registro só, e podia
                  confirmar a perda de meses de histórico sem perceber. */}
              <Botao
                variante="contorno"
                onClick={() => mesclar(g)}
                style={{ width: "auto", paddingInline: 14, fontSize: 12 }}
              >
                Marcar cópias
              </Botao>
            </div>

            {/* O agrupamento é só por valor e descrição, então seis meses de
                aluguel entram no mesmo grupo. Sem este aviso, "cópias" leva
                o dono a apagar histórico legítimo. */}
            <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>
              Mesmo valor e mesma descrição. Confira as datas antes de marcar —
              contas mensais aparecem aqui sem serem cópias.
            </p>

            <ul className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
              {g.ocorrencias.map((o) => {
                const marcado = paraExcluir.has(o.id);
                return (
                  <li key={o.id} className="flex items-center" style={{ gap: 8 }}>
                    <span
                      className="min-w-0 flex-1 truncate"
                      style={{
                        fontSize: 12,
                        color: "var(--mut)",
                        textDecoration: marcado ? "line-through" : undefined,
                      }}
                    >
                      {dataBr(o.data_registro)}
                      {o.conta?.nome ? ` · ${o.conta.nome}` : ""}
                      {o.forma_pagamento ? ` · ${o.forma_pagamento}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => editar(o)}
                      aria-label={`Editar lançamento de ${dataBr(o.data_registro)}`}
                      className="grid place-items-center"
                      style={{
                        width: 30,
                        height: 30,
                        minHeight: 30,
                        background: "transparent",
                        color: "var(--mut)",
                        flexShrink: 0,
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.5} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => alternar(o.id)}
                      aria-pressed={marcado}
                      style={{
                        minHeight: 30,
                        borderRadius: 999,
                        padding: "4px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                        background: marcado ? "var(--bad)" : "transparent",
                        color: marcado ? "#ffffff" : "var(--color-text)",
                        border: `1px solid ${marcado ? "var(--bad)" : "var(--ln)"}`,
                      }}
                    >
                      {marcado ? "Vai excluir" : "Marcar"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {paraExcluir.size > 0 ? (
        <div
          className="fixed inset-x-0 z-40 mx-auto"
          style={{
            bottom: "calc(56px + env(safe-area-inset-bottom))",
            maxWidth: "var(--largura)",
            padding: 12,
            background: "var(--sf)",
            borderTop: "1px solid var(--ln)",
          }}
        >
          {erro ? (
            <p role="alert" style={{ fontSize: 12, color: "var(--bad)", marginBottom: 8 }}>
              {erro}
            </p>
          ) : null}
          <Botao onClick={salvar} carregando={salvando}>
            Excluir {paraExcluir.size}{" "}
            {paraExcluir.size === 1 ? "lançamento" : "lançamentos"}
          </Botao>
        </div>
      ) : null}
    </>
  );
}
