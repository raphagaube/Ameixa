import { dadosDoRelatorio } from "@/lib/dados/relatorios";
import { lancamentosDoPeriodo } from "@/lib/dados/lancamentos";
import { metasDoUsuario } from "@/lib/dados/metas";
import { orcamentosDoMes } from "@/lib/dados/orcamentos";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { dataDoBanco } from "@/lib/formato";
import { DocumentoRelatorio } from "./documento";

export const metadata = { title: "Relatório · Ameixa" };

export default async function Documento({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const hoje = new Date();
  const de = p.de ?? `${hoje.getFullYear()}-01-01`;
  const ate = p.ate ?? `${hoje.getFullYear()}-12-31`;

  const secoes = (p.secoes ?? "resumo,categorias,evolucao,receitas").split(",");
  const situacoes = (p.situacoes ?? "").split(",").filter(Boolean);
  const ocultar = p.ocultar === "1";
  const tecnicos = p.tecnicos === "1";

  const fim = dataDoBanco(ate);

  const [dados, perfil, lancamentos, orcamentos, metas] = await Promise.all([
    dadosDoRelatorio(de, ate),
    perfilDoUsuario(),
    secoes.includes("detalhes")
      ? lancamentosDoPeriodo({ de, ate, ordem: "antigos" })
      : Promise.resolve([]),
    secoes.includes("orcamentos")
      ? orcamentosDoMes(fim.getFullYear(), fim.getMonth())
      : Promise.resolve([]),
    secoes.includes("metas") ? metasDoUsuario() : Promise.resolve([]),
  ]);

  // O filtro de situação vale para a lista detalhada; os totais dos gráficos
  // seguem o período inteiro, senão a rosca não bate com o resumo.
  const detalhados =
    situacoes.length > 0
      ? lancamentos.filter((l) => situacoes.includes(l.situacao))
      : lancamentos;

  return (
    <DocumentoRelatorio
      dados={dados}
      nome={perfil?.nome ?? ""}
      de={de}
      ate={ate}
      secoes={secoes}
      ocultar={ocultar}
      tecnicos={tecnicos}
      lancamentos={detalhados}
      orcamentos={orcamentos}
      metas={metas}
    />
  );
}
