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

export const ROTULO_FREQUENCIA: Record<Frequencia, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  semestral: "Semestral",
  anual: "Anual",
  personalizado: "Personalizado",
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

/** As situações que fazem sentido para cada tipo, na ordem da interface. */
export function situacoesDoTipo(tipo: TipoLancamento): Situacao[] {
  if (tipo === "receita") return ["recebido", "a_receber"];
  if (tipo === "aporte") return ["guardado"];
  return ["pago", "a_pagar"];
}
