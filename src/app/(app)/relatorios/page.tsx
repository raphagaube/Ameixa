import { hojeEmBrasilia } from "@/lib/formato";
import { limitesDoMes } from "@/lib/dados/lancamentos";
import { dadosDoRelatorio } from "@/lib/dados/relatorios";
import { datasPorDoRelatorio } from "@/lib/extrato-impresso";
import { PainelRelatorios } from "./painel-relatorios";

export const metadata = { title: "Relatórios · Ameixa" };

export default async function Relatorios({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string; datas?: string }>;
}) {
  const p = await searchParams;
  const hoje = hojeEmBrasilia();
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();
  const datasPor = datasPorDoRelatorio(p.datas);

  const { de, ate } = limitesDoMes(ano, mes);
  const dados = await dadosDoRelatorio(de, ate, datasPor);

  return <PainelRelatorios dados={dados} ano={ano} mes={mes} datasPor={datasPor} />;
}
