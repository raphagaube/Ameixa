"use client";

import Link from "next/link";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { moeda } from "@/lib/formato";
import { percentualDaMeta, prazoPorExtenso, type Meta } from "@/lib/tipos/metas";

/** Meta em destaque no Início. Trocar leva para a tela de Metas. */
export function MetaDestaque({ meta }: { meta: Meta }) {
  const pct = percentualDaMeta(meta);
  const prazo = prazoPorExtenso(meta);

  return (
    <section
      style={{
        borderRadius: "var(--r)",
        border: "1px solid var(--ln2)",
        background: "var(--sf)",
        padding: "13px 14px",
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: 8 }}>
        <h2 style={{ fontSize: 17 }}>{meta.nome}</h2>
        <Link
          href="/metas"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--deep)", flexShrink: 0 }}
        >
          Trocar
        </Link>
      </div>

      <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>
        {[meta.conta?.nome, meta.aplicacao].filter(Boolean).join(" · ")}
      </p>

      <div className="flex items-baseline justify-between" style={{ gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700 }}>{moeda(meta.guardado)}</span>
        <span style={{ fontSize: 14, color: "var(--mut)" }}>de {moeda(meta.alvo)}</span>
      </div>

      <div style={{ marginTop: 8 }}>
        <BarraProgresso percentual={pct} rotulo={`Progresso de ${meta.nome}`} />
      </div>

      <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>
        {pct}%{prazo ? ` · prazo de ${prazo}` : ""}
      </p>
    </section>
  );
}
