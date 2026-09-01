import { limitesDoMes } from "@/lib/dados/lancamentos";
import { dadosDoRelatorio } from "@/lib/dados/relatorios";
import { PainelRelatorios } from "./painel-relatorios";

export const metadata = { title: "Relatórios · Ameixa" };

export default async function Relatorios({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const p = await searchParams;
  const hoje = new Date();
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();

  const { de, ate } = limitesDoMes(ano, mes);
  const dados = await dadosDoRelatorio(de, ate);

  return <PainelRelatorios dados={dados} ano={ano} mes={mes} />;
}
