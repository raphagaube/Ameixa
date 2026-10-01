import { paraIso } from "@/lib/formato";
import type { Ordem } from "@/lib/dados/lancamentos";
import { ROTULO_SITUACAO, type LancamentoNaLista, type Situacao } from "@/lib/tipos/lancamentos";

/**
 * O que a tela do extrato e o documento impresso precisam ler igual.
 *
 * O documento abre com os mesmos parâmetros da tela; se cada um
 * interpretasse o endereço do seu jeito, o papel mostraria um período e a
 * tela outro.
 */

export type Periodo = "dia" | "mes" | "ano" | "faixa";
export type DatasPor = "registro" | "vencimento";

function intervalo(
  periodo: Periodo,
  ano: number,
  mes: number,
  dia: number,
  de?: string,
  ate?: string,
) {
  if (periodo === "dia") {
    const d = paraIso(new Date(ano, mes, dia));
    return { de: d, ate: d };
  }
  if (periodo === "ano") {
    return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
  }
  if (periodo === "faixa" && de && ate) {
    // Datas invertidas não podem devolver lista vazia sem explicação.
    return de <= ate ? { de, ate } : { de: ate, ate: de };
  }
  return { de: paraIso(new Date(ano, mes, 1)), ate: paraIso(new Date(ano, mes + 1, 0)) };
}

export function lerParametrosDoExtrato(
  p: Record<string, string | undefined>,
  hoje = new Date(),
) {
  const periodo = (p.periodo as Periodo) ?? "mes";
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();
  const dia = Number(p.dia) || hoje.getDate();
  const ordem = (p.ordem as Ordem) ?? "recentes";
  const datasPor: DatasPor = p.datas === "vencimento" ? "vencimento" : "registro";

  return { periodo, ano, mes, dia, ordem, datasPor, ...intervalo(periodo, ano, mes, dia, p.de, p.ate) };
}

/**
 * Totais do documento. Aporte em meta não é despesa nem receita: aparece na
 * lista, mas fica fora das somas — a regra inviolável do projeto.
 */
export function totaisDoExtrato(lancamentos: Pick<LancamentoNaLista, "tipo" | "valor">[]) {
  let receitas = 0;
  let despesas = 0;
  let aportes = 0;
  for (const l of lancamentos) {
    if (l.tipo === "receita") receitas += l.valor;
    else if (l.tipo === "despesa") despesas += l.valor;
    else aportes += 1;
  }
  return { receitas, despesas, saldo: receitas - despesas, aportes, quantidade: lancamentos.length };
}

/** Os filtros ligados, em palavras, para o cabeçalho do documento. */
export function descreverFiltros(f: {
  texto?: string;
  categoria?: string;
  subcategoria?: string;
  situacao?: string;
  forma?: string;
  responsavel?: string;
}): string[] {
  const situacao = f.situacao ? ROTULO_SITUACAO[f.situacao as Situacao] : undefined;
  return [
    f.texto ? `busca "${f.texto}"` : null,
    f.categoria ? `categoria ${f.categoria}` : null,
    f.subcategoria ? `subcategoria ${f.subcategoria}` : null,
    situacao ? `situação ${situacao.toLowerCase()}` : null,
    f.forma ? `forma de pagamento ${f.forma}` : null,
    f.responsavel ? `responsável "${f.responsavel}"` : null,
  ].filter((x): x is string => !!x);
}

/** Nome do arquivo com o período dentro, para não virar "documento (3)". */
export function nomeDoExtrato(de: string, ate: string): string {
  return `extrato-ameixa-${de}-a-${ate}.pdf`;
}

/** O sinal que acompanha o valor na lista: aporte não tem sinal. */
export function sinalDoTipo(tipo: LancamentoNaLista["tipo"]): string {
  return tipo === "receita" ? "+" : tipo === "aporte" ? "" : "−";
}

/** Como cada escolha aparece escrita no cabeçalho de um documento. */
export const ROTULO_DATAS: Record<DatasPor, string> = {
  vencimento: "pelo vencimento",
  registro: "pela data do registro",
};

/**
 * Nos relatórios o padrão é o vencimento: "contas de outubro" são as que
 * vencem em outubro. Só `datas=registro` no endereço muda isso.
 */
export function datasPorDoRelatorio(valor: string | undefined): DatasPor {
  return valor === "registro" ? "registro" : "vencimento";
}
