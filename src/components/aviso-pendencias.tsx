import { ChevronRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Dinheiro } from "@/components/dinheiro";
import { moeda } from "@/lib/formato";

export function AvisoPendencias({ quantidade, semConta }: {
  quantidade: number;
  semConta?: { quantidade: number; valor: number };
}) {
  if (quantidade === 0) return null;
  return (
    <Link href="/pendencias" className="espaco-card espaco-aviso flex items-center" style={{ gap: 12, padding: "13px 14px", border: "1px solid var(--ln)", borderRadius: "var(--r)", background: "var(--sf)", color: "var(--color-text)" }}>
      <TriangleAlert size={22} strokeWidth={1.5} style={{ color: "var(--warn)", flexShrink: 0 }} aria-hidden />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{quantidade === 1 ? "Você tem 1 lançamento para completar" : `Você tem ${quantidade} lançamentos para completar`}</span>
        {semConta && semConta.quantidade > 0 ? (
          <span className="tip-detalhe" style={{ display: "block", marginTop: 4, fontSize: 13, lineHeight: 1.45, color: "var(--mut)" }}>
            <Dinheiro>{moeda(semConta.valor)}</Dinheiro> em lançamentos sem conta escolhida. Isso pode causar diferença nos saldos.
          </span>
        ) : null}
        <span className="tip-detalhe" style={{ display: "block", marginTop: 4, fontSize: 13, color: "var(--mut)" }}>Ver pendências</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.5} style={{ color: "var(--mut)", flexShrink: 0 }} aria-hidden />
    </Link>
  );
}
