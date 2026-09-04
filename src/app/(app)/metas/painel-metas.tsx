"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { moeda } from "@/lib/formato";
import type { Conta } from "@/lib/tipos/contas";
import { percentualDaMeta, prazoPorExtenso, type Meta } from "@/lib/tipos/metas";
import { destacarMeta } from "./acoes";
import { FolhaMeta } from "./folha-meta";
import { Dinheiro } from "@/components/dinheiro";

export function PainelMetas({
  metas,
  contas,
  destaque,
}: {
  metas: Meta[];
  contas: Conta[];
  destaque: string | null;
}) {
  const router = useRouter();
  const [emEdicao, setEmEdicao] = useState<Meta | "nova" | null>(null);
  const [, iniciar] = useTransition();

  function fechar(salvou: boolean) {
    setEmEdicao(null);
    if (salvou) router.refresh();
  }

  function alternarDestaque(id: string) {
    iniciar(async () => {
      await destacarMeta(destaque === id ? null : id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col" style={{ gap: 14, paddingTop: 22 }}>
      <h1 style={{ fontSize: 30 }}>Metas</h1>

      <Botao variante="contorno" onClick={() => setEmEdicao("nova")}>
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <Plus size={18} strokeWidth={1.5} aria-hidden />
          Nova meta
        </span>
      </Botao>

      {metas.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--mut)", padding: "24px 0" }}>
          Nenhuma meta ainda. Crie uma para começar a guardar.
        </p>
      ) : (
        <ul className="flex flex-col" style={{ gap: 12 }}>
          {metas.map((m) => {
            const pct = percentualDaMeta(m);
            const prazo = prazoPorExtenso(m);
            const noPainel = destaque === m.id;
            const falta = Math.max(m.alvo - m.guardado, 0);

            return (
              <li
                key={m.id}
                style={{
                  borderRadius: "var(--r)",
                  border: "1px solid var(--ln2)",
                  background: "var(--sf)",
                  padding: "13px 14px",
                }}
              >
                <div className="flex items-start justify-between" style={{ gap: 8 }}>
                  <h2 style={{ fontSize: 17 }}>{m.nome}</h2>
                  <button
                    type="button"
                    onClick={() => setEmEdicao(m)}
                    aria-label={`Editar ${m.nome}`}
                    className="grid place-items-center"
                    style={{
                      width: 44,
                      height: 44,
                      minHeight: 44,
                      background: "transparent",
                      color: "var(--mut)",
                    }}
                  >
                    <Pencil size={16} strokeWidth={1.5} aria-hidden />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => alternarDestaque(m.id)}
                  aria-pressed={noPainel}
                  style={{
                    minHeight: 44,
                    marginTop: 2,
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: noPainel ? 700 : 500,
                    background: noPainel ? "var(--tint)" : "transparent",
                    color: noPainel ? "var(--deep)" : "var(--mut)",
                    border: `1px solid ${noPainel ? "var(--deep)" : "var(--ln)"}`,
                  }}
                >
                  {noPainel ? "No painel" : "Mostrar no painel"}
                </button>

                <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>
                  {[m.conta?.nome, m.aplicacao, prazo].filter(Boolean).join(" · ")}
                </p>

                <div
                  className="flex items-baseline justify-between"
                  style={{ gap: 8, marginTop: 6 }}
                >
                  <span style={{ fontSize: 22, fontWeight: 700 }}>
                    <Dinheiro>{moeda(m.guardado)}</Dinheiro>
                  </span>
                  <span style={{ fontSize: 14, color: "var(--mut)" }}>
                    de <Dinheiro>{moeda(m.alvo)}</Dinheiro>
                  </span>
                </div>

                <div style={{ marginTop: 8 }}>
                  <BarraProgresso percentual={pct} rotulo={`Progresso de ${m.nome}`} />
                </div>

                <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>
                  {pct >= 100 ? (
                    "Meta alcançada! 🎉"
                  ) : (
                    <>
                      {pct}% — faltam <Dinheiro>{moeda(falta)}</Dinheiro>
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {emEdicao ? (
        <FolhaMeta
          meta={emEdicao === "nova" ? null : emEdicao}
          contas={contas}
          aoFechar={fechar}
        />
      ) : null}
    </div>
  );
}
