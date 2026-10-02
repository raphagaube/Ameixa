import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { acharCopias, acharParecidos } from "@/lib/copias";
import { lancamentosParaCopias, type LancamentoParaCopias } from "@/lib/dados/copias";
import { dataBr, hojeEmBrasilia } from "@/lib/formato";
import { ROTULO_SITUACAO, type Situacao } from "@/lib/tipos/lancamentos";
import { PainelCopias, type LinhaCopia } from "./painel-copias";

export const metadata = { title: "Cópias de importação · Ameixa" };

/** O dia, em Brasília, em que o lançamento foi gravado. */
const gravadoEm = (l: LancamentoParaCopias) => dataBr(hojeEmBrasilia(new Date(l.criado_em)));

function linha(l: LancamentoParaCopias, detalhe: string): LinhaCopia {
  return {
    id: l.id,
    tipo: l.tipo === "receita" ? "receita" : "despesa",
    valor: l.valor,
    descricao: l.descricao,
    data: l.data_registro,
    detalhe,
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

  const { copias } = acharCopias(lancamentos);
  // Os parecidos são procurados no que sobra depois de tirar as cópias
  // certas: senão cada cópia apareceria de novo, agora como "parecida".
  const grupos = acharParecidos(lancamentos, new Set(copias.map((c) => c.copia.id)));

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Cópias de importação" />
      <PainelCopias
        copias={copias.map((c) =>
          linha(
            c.copia,
            `${c.copia.categoria ?? "Sem categoria"} · gravado em ${gravadoEm(c.copia)}; o que fica é de ${gravadoEm(c.original)}`,
          ),
        )}
        grupos={grupos.map((g) => ({
          classe: g.classe,
          tipo: g.tipo === "receita" ? ("receita" as const) : ("despesa" as const),
          data: g.data,
          peloVencimento: g.peloVencimento,
          valor: g.valor,
          itens: g.itens.map((l) =>
            linha(
              l,
              `registrado em ${dataBr(l.data_registro)} · ${ROTULO_SITUACAO[l.situacao as Situacao] ?? l.situacao} · ${l.categoria ?? "Sem categoria"} · gravado em ${gravadoEm(l)}`,
            ),
          ),
        }))}
        marcarDeInicio={(p.marcar ?? "").split(",").filter(Boolean)}
      />
    </div>
  );
}
