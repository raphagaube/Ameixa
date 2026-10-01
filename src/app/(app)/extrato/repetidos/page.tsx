import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { lancamentosDoPeriodo } from "@/lib/dados/lancamentos";
import { agruparRepetidos } from "@/lib/repetidos";
import { PainelRepetidos } from "./painel-repetidos";

export const metadata = { title: "Repetidos · Ameixa" };

export default async function Repetidos({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const p = await searchParams;
  const hoje = new Date();
  // Sem período informado, olha o ano inteiro — duplicata costuma estar
  // espalhada, não no mês corrente.
  const de = p.de ?? `${hoje.getFullYear()}-01-01`;
  const ate = p.ate ?? `${hoje.getFullYear()}-12-31`;

  // O ano inteiro, não os 500 da tela do extrato: com o teto padrão, a
  // busca enxergava só o começo do ano e deixava passar o resto.
  const lancamentos = await lancamentosDoPeriodo({ de, ate, ordem: "antigos", limite: 20000 });
  const grupos = agruparRepetidos(lancamentos);

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Repetidos" />
      <PainelRepetidos grupos={grupos} de={de} ate={ate} />
    </div>
  );
}
