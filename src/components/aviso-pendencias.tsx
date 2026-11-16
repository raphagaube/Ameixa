import { ChevronRight, ListChecks } from "lucide-react";
import Link from "next/link";

export function AvisoPendencias({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) return null;
  return (
    <Link href="/pendencias" className="flex items-center" style={{ gap: 12, padding: "13px 14px", border: "1px solid var(--ln)", borderRadius: "var(--r)", background: "var(--sf)", color: "var(--color-text)" }}>
      <ListChecks size={22} strokeWidth={1.5} style={{ color: "var(--deep)", flexShrink: 0 }} aria-hidden />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{quantidade === 1 ? "Você tem 1 lançamento para completar" : `Você tem ${quantidade} lançamentos para completar`}</span>
        <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "var(--mut)" }}>Ver pendências</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.5} style={{ color: "var(--mut)", flexShrink: 0 }} aria-hidden />
    </Link>
  );
}
