import { contasDoUsuario } from "@/lib/dados/contas";
import { faturasDoMes } from "@/lib/dados/faturas";
import { resumoDoMes } from "@/lib/dados/resumo-mes";
import { panoramaDasContas } from "@/lib/dados/saldos";
import { PainelCartoes } from "./painel-cartoes";

export const metadata = { title: "Cartões e contas · Ameixa" };

export default async function CartoesEContas({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const p = await searchParams;
  const hoje = new Date();
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();

  const [contas, faturas, resumo, panorama] = await Promise.all([
    contasDoUsuario(),
    faturasDoMes(ano, mes),
    resumoDoMes(ano, mes),
    panoramaDasContas(),
  ]);

  return (
    <PainelCartoes
      contas={contas}
      faturas={faturas}
      totalDespesasDoMes={resumo.despesas}
      saldos={panorama.contas}
      ano={ano}
      mes={mes}
    />
  );
}
