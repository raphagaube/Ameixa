import Link from "next/link";

export function CabecalhoPlanejamento({ ativa }: { ativa: "metas" | "orcamentos" }) {
  return (
    <header className="flex flex-col" style={{ gap: 16, paddingTop: 22, marginBottom: 16 }}>
      <div><p className="rotulo">Minha gestão</p><h1 style={{ fontSize: 30, marginTop: 4 }}>Metas e orçamentos</h1></div>
      <nav aria-label="Metas e orçamentos" className="abas-planejamento">
        <Link href="/metas" aria-current={ativa === "metas" ? "page" : undefined}>Metas</Link>
        <Link href="/orcamentos" aria-current={ativa === "orcamentos" ? "page" : undefined}>Orçamentos</Link>
      </nav>
    </header>
  );
}
