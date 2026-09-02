import { categoriasDoUsuario } from "@/lib/dados/categorias";
import { mesReferencia, orcamentosDoMes } from "@/lib/dados/orcamentos";
import { PainelOrcamentos } from "./painel-orcamentos";

export const metadata = { title: "Orçamentos · Ameixa" };

export default async function Orcamentos({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const p = await searchParams;
  const hoje = new Date();
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();

  const [orcamentos, categorias] = await Promise.all([
    orcamentosDoMes(ano, mes),
    categoriasDoUsuario().then((c) => c ?? []),
  ]);

  return (
    <PainelOrcamentos
      orcamentos={orcamentos}
      categorias={categorias.filter((c) => c.tipo === "despesa")}
      ano={ano}
      mes={mes}
      mesIso={mesReferencia(ano, mes)}
    />
  );
}
