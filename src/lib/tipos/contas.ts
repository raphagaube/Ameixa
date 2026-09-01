/**
 * Tipos e helpers puros de contas e cartões.
 *
 * Fica separado de lib/dados/contas.ts de propósito: aquele é "server-only"
 * e componentes de cliente não podem importá-lo. Aqui não há acesso a banco,
 * então roda dos dois lados.
 */

export type TipoConta = "corrente" | "poupanca" | "investimento" | "dinheiro";

export const ROTULO_TIPO_CONTA: Record<TipoConta, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  investimento: "Investimento",
  dinheiro: "Dinheiro",
};

export type Cartao = {
  id: string;
  conta_id: string;
  nome: string;
  bandeira: string;
  final: string | null;
  cor: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
};

export type Conta = {
  id: string;
  nome: string;
  tipo: TipoConta;
  cor: string;
  saldo_inicial: number;
  varias: boolean;
  qtd_contas: number;
  tem_debito: boolean;
  tem_credito: boolean;
  tem_pix: boolean;
  cartoes: Cartao[];
};

/** Meios de pagamento habilitados, para os chips do cartão de banco. */
export function meiosDaConta(c: Conta): string[] {
  const meios: string[] = [];
  if (c.tem_debito) meios.push("Débito");
  if (c.tem_credito) meios.push("Crédito");
  if (c.tem_pix) meios.push("Pix");
  return meios;
}
