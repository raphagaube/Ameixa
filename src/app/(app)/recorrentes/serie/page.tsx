import Link from "next/link";
import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { ocorrenciasDaSerie } from "@/lib/dados/lancamentos";
import { separarSufixo } from "@/lib/recorrentes";
import { PainelSerie } from "./painel-serie";

export const metadata = { title: "Série completa · Ameixa" };

export default async function SerieCompleta({
  searchParams,
}: {
  searchParams: Promise<{ chave?: string }>;
}) {
  const { chave = "" } = await searchParams;
  const itens = chave ? await ocorrenciasDaSerie(chave) : [];

  if (itens.length === 0) {
    return (
      <div className="flex flex-col" style={{ gap: 14 }}>
        <CabecalhoVoltar titulo="Série" />
        <p style={{ fontSize: 14, color: "var(--mut)" }}>
          Não encontrei lançamentos desta série. Ela pode ter sido excluída.
        </p>
        <Link href="/recorrentes" style={{ color: "var(--deep)", fontWeight: 600 }}>
          Voltar para Contas recorrentes
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo={separarSufixo(itens[0].descricao).base} />
      <PainelSerie itens={itens} vinculada={chave.startsWith("s:")} />
    </div>
  );
}
