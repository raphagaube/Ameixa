export type TipoLancamento = "despesa" | "receita" | "aporte";

export type Situacao =
  | "pago"
  | "a_pagar"
  | "recebido"
  | "a_receber"
  | "guardado";

export type TipoRepeticao = "unica" | "parcelada" | "recorrente" | "assinatura";

export type Frequencia =
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "semestral"
  | "anual"
  | "personalizado";

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  pago: "Já pago",
  a_pagar: "A pagar",
  recebido: "Recebido",
  a_receber: "A receber",
  guardado: "Guardado",
};

/** Em quê o intervalo personalizado é contado. */
export type UnidadeIntervalo = "dias" | "semanas" | "meses";

export const ROTULO_UNIDADE: Record<UnidadeIntervalo, string> = {
  dias: "dias",
  semanas: "semanas",
  meses: "meses",
};

export const ROTULO_FREQUENCIA: Record<Frequencia, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  semestral: "Semestral",
  anual: "Anual",
  personalizado: "A cada…",
};

export type Lancamento = {
  id: string;
  tipo: TipoLancamento;
  valor: number;
  descricao: string;
  data_registro: string;
  data_vencimento: string | null;
  situacao: Situacao;
  categoria_id: string | null;
  subcategoria_id: string | null;
  conta_id: string | null;
  cartao_id: string | null;
  forma_pagamento: string | null;
  responsavel: string | null;
  observacao: string | null;
  meta_id: string | null;
  serie_id: string | null;
  serie_tipo: TipoRepeticao | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  incompleto: boolean;
};

/** Como o lançamento aparece no extrato, já com nomes resolvidos. */
export type LancamentoNaLista = Lancamento & {
  categoria: { nome: string; cor: string; cor_texto: string } | null;
  subcategoria: { nome: string } | null;
  conta: { nome: string } | null;
  cartao: { nome: string } | null;
};

/**
 * A data que vale para o lançamento: o vencimento, quando existe.
 *
 * Nem todo lançamento tem vencimento — uma compra à vista, por exemplo,
 * só tem a data em que aconteceu. Nesses casos a data de registro é a
 * resposta certa, e não um buraco.
 *
 * Mora aqui, e não em cada tela, porque o relatório e a agenda precisam
 * concordar: um compromisso caindo num dia e o PDF dizendo outro seria
 * pior que qualquer um dos dois estar errado sozinho.
 */
export function dataQueVale(l: {
  data_vencimento: string | null;
  data_registro: string;
}): string {
  return (l.data_vencimento ?? l.data_registro).slice(0, 10);
}

/**
 * Situação padrão pelo tipo e pela data.
 * Regra 3 do modelo de dados: lançamento com data futura entra
 * automaticamente como a pagar / a receber.
 */
export function situacaoPadrao(
  tipo: TipoLancamento,
  dataIso: string,
  hojeIso: string,
): Situacao {
  if (tipo === "aporte") return "guardado";
  const futuro = dataIso > hojeIso;
  if (tipo === "receita") return futuro ? "a_receber" : "recebido";
  return futuro ? "a_pagar" : "pago";
}

/**
 * Para onde vai cada tipo numa mudança de situação em lote.
 *
 * Devolve `null` quando o lançamento não deve ser tocado. Aporte em meta é
 * o caso: ele é 'guardado' e não tem par pago/pendente, e marcá-lo como
 * recebido o transformaria em receita nos relatórios — exatamente o que a
 * primeira regra inviolável proíbe.
 */
export function situacaoAlvo(
  tipo: TipoLancamento,
  alvo: "quitado" | "pendente",
): Situacao | null {
  if (tipo === "aporte") return null;
  if (tipo === "receita") return alvo === "quitado" ? "recebido" : "a_receber";
  return alvo === "quitado" ? "pago" : "a_pagar";
}

/**
 * Mesma data, outro dia do mês. Usado para acertar o vencimento de uma
 * série inteira: cada lançamento fica no mês em que já estava.
 *
 * Dia maior que o mês (31 em setembro) vira o último dia do mês, em vez de
 * transbordar para o mês seguinte como o `Date` faria sozinho.
 */
export function trocarDiaDoMes(iso: string, dia: number): string {
  const [a, m] = iso.slice(0, 10).split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  const d = Math.min(Math.max(1, Math.trunc(dia)), ultimo);
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** As situações que fazem sentido para cada tipo, na ordem da interface. */
export function situacoesDoTipo(tipo: TipoLancamento): Situacao[] {
  if (tipo === "receita") return ["recebido", "a_receber"];
  if (tipo === "aporte") return ["guardado"];
  return ["pago", "a_pagar"];
}
