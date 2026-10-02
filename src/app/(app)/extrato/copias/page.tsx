import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { acharCopias } from "@/lib/copias";
import { lancamentosParaCopias, type LancamentoParaCopias } from "@/lib/dados/copias";
import { dataBr, hojeEmBrasilia } from "@/lib/formato";
import { PainelCopias, type LinhaCopia } from "./painel-copias";

export const metadata = { title: "Cópias de importação · Ameixa" };

/** O dia, em Brasília, em que o lançamento foi gravado. */
const gravadoEm = (l: LancamentoParaCopias) => dataBr(hojeEmBrasilia(new Date(l.criado_em)));

function linha(
  l: LancamentoParaCopias,
  original: LancamentoParaCopias,
  difere: string[] = [],
): LinhaCopia {
  return {
    id: l.id,
    tipo: l.tipo === "receita" ? "receita" : "despesa",
    valor: l.valor,
    descricao: l.descricao,
    data: l.data_registro,
    categoria: l.categoria,
    gravadoEm: gravadoEm(l),
    originalGravadoEm: gravadoEm(original),
    difere,
  };
}

export default async function Copias({
  searchParams,
}: {
  searchParams: Promise<{ marcar?: string }>;
}) {
  const p = await searchParams;
  const lancamentos = await lancamentosParaCopias();

  if (!lancamentos) {
    return (
      <div className="flex flex-col" style={{ gap: 14 }}>
        <CabecalhoVoltar titulo="Cópias de importação" />
        <p role="alert" style={{ fontSize: 14, color: "var(--bad)" }}>
          Não deu para ler os lançamentos agora. Sem a lista inteira eu não aponto cópia nenhuma —
          tente de novo em instantes.
        </p>
      </div>
    );
  }

  const { copias, paraConferir } = acharCopias(lancamentos);

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Cópias de importação" />
      <PainelCopias
        copias={copias.map((c) => linha(c.copia, c.original))}
        paraConferir={paraConferir.map((c) => linha(c.item, c.manter, c.difere))}
        marcarDeInicio={(p.marcar ?? "").split(",").filter(Boolean)}
      />
    </div>
  );
}
