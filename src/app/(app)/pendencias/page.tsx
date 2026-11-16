import Link from "next/link";
import { Sparkles } from "lucide-react";
import { pendencias } from "@/lib/dados/lancamentos";
import { ListaPendencias } from "./lista-pendencias";

export const metadata = { title: "Pendências · Ameixa" };

export default async function Pendencias() {
  const lista = await pendencias();

  return (
    <div className="flex flex-col" style={{ gap: 14, paddingTop: 22 }}>
      <header>
        <p className="rotulo">Minha gestão</p>
        <h1 style={{ fontSize: 30, marginTop: 4 }}>Pendências</h1>
        {lista.length > 0 ? <p style={{ fontSize: 14, color: "var(--mut)", marginTop: 6 }}>{lista.length} {lista.length === 1 ? "lançamento para completar" : "lançamentos para completar"}. Abra um item para preencher o que falta.</p> : null}
      </header>

      {lista.length > 3 ? (
        <Link
          href="/pendencias/organizar"
          className="flex items-center"
          style={{
            gap: 10,
            borderRadius: "var(--r)",
            border: "1px solid var(--deep)",
            background: "var(--tint)",
            padding: "13px 14px",
            color: "var(--color-text)",
          }}
        >
          <Sparkles
            size={20}
            strokeWidth={1.5}
            style={{ color: "var(--deep)", flexShrink: 0 }}
            aria-hidden
          />
          <span>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>
              Organizar em lote
            </span>
            <span style={{ display: "block", fontSize: 12, color: "var(--mut)" }}>
              Categorizar {lista.length} de uma vez, pela origem
            </span>
          </span>
        </Link>
      ) : null}

      <ListaPendencias lista={lista} />
    </div>
  );
}
