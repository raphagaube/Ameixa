import "server-only";
import { paraIso } from "@/lib/formato";
import { saldosPorConta, totalDasContas, valorSemConta, type ContaComSaldo } from "@/lib/saldo-conta";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type PanoramaDasContas = {
  contas: ContaComSaldo[];
  total: number;
  disponivel: number;
  guardado: number;
  semConta: number;
};

/** Conta corrente e dinheiro dão para gastar hoje; o resto está guardado. */
const DISPONIVEIS = new Set(["corrente", "dinheiro"]);

/**
 * Saldo real de cada conta: o cadastrado mais o que se movimentou nela.
 *
 * Considera os lançamentos até hoje. Lançamento com data futura — uma
 * parcela de dezembro, por exemplo — não pode aparecer como dinheiro que
 * já saiu da conta.
 */
export async function panoramaDasContas(): Promise<PanoramaDasContas> {
  const supabase = await criarClienteServidor();
  const hoje = paraIso(new Date());

  const [{ data: contas }, { data: movimentos }] = await Promise.all([
    supabase
      .from("contas")
      .select("id, nome, cor, tipo, saldo_inicial")
      .eq("arquivada", false)
      .order("nome", { ascending: true }),
    supabase
      .from("lancamentos")
      .select("conta_id, tipo, valor")
      .lte("data_registro", hoje),
  ]);

  const comSaldo = saldosPorConta(contas ?? [], movimentos ?? []);

  return {
    contas: comSaldo,
    total: totalDasContas(comSaldo),
    disponivel: comSaldo
      .filter((c) => DISPONIVEIS.has(c.tipo))
      .reduce((s, c) => s + c.saldo, 0),
    guardado: comSaldo
      .filter((c) => !DISPONIVEIS.has(c.tipo))
      .reduce((s, c) => s + c.saldo, 0),
    semConta: valorSemConta(movimentos ?? []),
  };
}
