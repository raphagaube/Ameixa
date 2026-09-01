"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { Botao } from "@/components/ui/botao";
import type { Categoria } from "@/lib/dados/categorias";
import { FolhaCategoria } from "./folha-categoria";

export function PainelCategorias({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const [emEdicao, setEmEdicao] = useState<Categoria | "nova" | null>(null);

  function fechar(salvou: boolean) {
    setEmEdicao(null);
    if (salvou) router.refresh();
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Categorias" />

      <Botao variante="contorno" onClick={() => setEmEdicao("nova")}>
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <Plus size={18} strokeWidth={1.5} aria-hidden />
          Nova categoria
        </span>
      </Botao>

      {categorias.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--mut)", padding: "24px 0" }}>
          Nenhuma categoria ainda.
        </p>
      ) : (
        <ul className="flex flex-col" style={{ gap: 12 }}>
          {categorias.map((c) => (
            <li
              key={c.id}
              className="relative overflow-hidden"
              style={{
                borderRadius: "var(--r)",
                border: "1px solid var(--ln2)",
                background: "var(--sf)",
                padding: "13px 14px 13px 18px",
              }}
            >
              {/* Faixa lateral de 4px na cor da categoria */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0"
                style={{ width: 4, background: c.cor }}
              />

              <div className="flex items-start justify-between" style={{ gap: 10 }}>
                <span
                  style={{
                    background: c.cor,
                    color: c.cor_texto,
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
                  onClick={() => setEmEdicao(c)}
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

              <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>
                {c.tipo === "despesa" ? "Despesa" : "Receita"} ·{" "}
                {c.subcategorias.length === 1
                  ? "1 subcategoria"
                  : `${c.subcategorias.length} subcategorias`}
              </p>

              {c.subcategorias.length > 0 ? (
                <ul className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
                  {c.subcategorias.map((s) => (
                    <li
                      key={s.id}
                      style={{
                        fontSize: 12,
                        color: "var(--mut)",
                        border: "1px solid var(--ln)",
                        borderRadius: 999,
                        padding: "3px 10px",
                      }}
                    >
                      {s.nome}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {emEdicao ? (
        <FolhaCategoria
          categoria={emEdicao === "nova" ? null : emEdicao}
          aoFechar={fechar}
        />
      ) : null}
    </div>
  );
}
