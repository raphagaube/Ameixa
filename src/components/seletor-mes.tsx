"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { mesAno } from "@/lib/formato";

/** Navegador de mês: setas ‹ › com o mês por extenso no meio. */
export function SeletorMes({ ano, mes }: { ano: number; mes: number }) {
  const caminho = usePathname();
  const params = useSearchParams();
  const anterior = new Date(ano, mes - 1, 1);
  const proximo = new Date(ano, mes + 1, 1);

  // Só o mês muda; o resto do endereço fica. Antes as setas montavam o
  // endereço do zero, e quem tinha escolhido "pelo vencimento" ou um filtro
  // voltava ao padrão ao trocar de mês, sem perceber.
  const href = (d: Date) => {
    const q = new URLSearchParams(params.toString());
    q.set("ano", String(d.getFullYear()));
    q.set("mes", String(d.getMonth()));
    return `${caminho}?${q.toString()}`;
  };

  const caixa: React.CSSProperties = {
    height: 44,
    borderRadius: "var(--rs)",
    border: "1px solid var(--ln)",
    color: "var(--color-text)",
  };

  return (
    <div
      className="grid items-center"
      style={{ gridTemplateColumns: "44px 1fr 44px", gap: 8 }}
    >
      <Link
        href={href(anterior)}
        aria-label={`Ir para ${mesAno(anterior)}`}
        className="grid place-items-center"
        style={caixa}
        scroll={false}
      >
        <ChevronLeft size={18} strokeWidth={1.5} aria-hidden />
      </Link>

      <div
        className="grid place-items-center"
        style={{ ...caixa, fontSize: 15, fontWeight: 600 }}
      >
        {mesAno(new Date(ano, mes, 1))}
      </div>

      <Link
        href={href(proximo)}
        aria-label={`Ir para ${mesAno(proximo)}`}
        className="grid place-items-center"
        style={caixa}
        scroll={false}
      >
        <ChevronRight size={18} strokeWidth={1.5} aria-hidden />
      </Link>
    </div>
  );
}
