import "server-only";
import { paraIso } from "@/lib/formato";
import { calcularSaldos } from "@/lib/saldo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ResumoMes = {
  /** Quanto você tem: saldo inicial das contas mais tudo até o fim do mês. */
  acumulado: number;
  /** Quanto sobrou ou faltou no mês escolhido. */
  resultado: number;
  receitas: number;
  despesas: number;
  pendentes: number;
};

/** Primeiro e último dia do mês, em ISO. */
export function limitesDoMes(ano: number, mes: number) {
  return {
    de: paraIso(new Date(ano, mes, 1)),
    ate: paraIso(new Date(ano, mes + 1, 0)),
  };
}

/**
 * Saldo acumulado e resultado do mês.
 *
 * Regra inviolável: aportes em meta NÃO entram. Eles movem dinheiro da
 * conta para a meta e ficam fora de receita, despesa, saldo e relatórios.
 */
export async function resumoDoMes(ano: number, mes: number): Promise<ResumoMes> {
  const supabase = await criarClienteServidor();
  const { de, ate } = limitesDoMes(ano, mes);

  const [{ data: ateOFim }, { data: doMes }, { data: contas }] = await Promise.all([
    // Tudo até o último dia do mês: é o que faz o saldo carregar de um mês
    // para o outro em vez de recomeçar do zero.
    supabase.from("lancamentos").select("tipo, valor").lte("data_registro", ate),
    supabase
      .from("lancamentos")
      .select("tipo, valor, incompleto")
      .gte("data_registro", de)
      .lte("data_registro", ate),
    supabase.from("contas").select("saldo_inicial").eq("arquivada", false),
  ]);

  const saldoInicial = (contas ?? []).reduce(
    (s, c) => s + Number(c.saldo_inicial),
    0,
  );

  const s = calcularSaldos(saldoInicial, ateOFim ?? [], doMes ?? []);

  return {
    acumulado: s.acumulado,
    resultado: s.resultadoDoMes,
    receitas: s.receitasDoMes,
    despesas: s.despesasDoMes,
    pendentes: (doMes ?? []).filter((l) => l.incompleto).length,
  };
}
