import { hojeEmBrasilia } from "@/lib/formato";
import Link from "next/link";
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
  const hoje = hojeEmBrasilia();
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
      {/* Planilha importada duas vezes é outro caso: lá o app sabe qual é a
          cópia, em vez de juntar tudo que tem o mesmo nome e valor. */}
      <Link
        href="/extrato/copias"
        style={{ fontSize: 13, fontWeight: 600, color: "var(--deep)", minHeight: 44, display: "flex", alignItems: "center" }}
      >
        Importou a mesma planilha duas vezes? Ver cópias de importação →
      </Link>
      <PainelRepetidos grupos={grupos} de={de} ate={ate} />
    </div>
  );
}
