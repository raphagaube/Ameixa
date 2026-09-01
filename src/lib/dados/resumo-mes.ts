import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { paraIso } from "@/lib/formato";

export type ResumoMes = {
  receitas: number;
  despesas: number;
  saldo: number;
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
 * Receitas, despesas e saldo do mês.
 *
 * Regra inviolável: aportes em meta NÃO entram aqui. Eles movem dinheiro da
 * conta para a meta e ficam fora de receita, despesa, saldo e relatórios.
 */
export async function resumoDoMes(ano: number, mes: number): Promise<ResumoMes> {
  const supabase = await criarClienteServidor();
  const { de, ate } = limitesDoMes(ano, mes);

  const { data, error } = await supabase
    .from("lancamentos")
    .select("tipo, valor, incompleto")
    .gte("data_registro", de)
    .lte("data_registro", ate);

  if (error || !data) {
    return { receitas: 0, despesas: 0, saldo: 0, pendentes: 0 };
  }

  let receitas = 0;
  let despesas = 0;
  let pendentes = 0;

  for (const l of data) {
    if (l.incompleto) pendentes += 1;
    // 'aporte' cai fora de propósito — ver regra acima.
    if (l.tipo === "receita") receitas += Number(l.valor);
    else if (l.tipo === "despesa") despesas += Number(l.valor);
  }

  return { receitas, despesas, saldo: receitas - despesas, pendentes };
}
