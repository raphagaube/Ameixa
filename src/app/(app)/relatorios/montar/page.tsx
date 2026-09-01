import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { MontadorRelatorio } from "./montador";

export const metadata = { title: "Montar relatório · Ameixa" };

export default async function Montar({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const p = await searchParams;
  const hoje = new Date();
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Montar relatório" />
      <MontadorRelatorio ano={ano} mes={mes} />
    </div>
  );
}
