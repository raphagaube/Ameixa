import "server-only";
import { todosOsMovimentos } from "@/lib/dados/movimentos";
import { paraIso } from "@/lib/formato";
import { saldosPorConta, totalDasContas, valorSemConta } from "@/lib/saldo-conta";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ResumoMes = {
  /** Quanto existe nas contas ao fim do mês escolhido. */
  acumulado: number;
  /** Quanto sobrou ou faltou no mês escolhido. */
  resultado: number;
  receitas: number;
  despesas: number;
  pendentes: number;
  /** Lançamentos sem conta escolhida, que não entram no saldo. */
  semConta: number;
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
 * O saldo é a soma do que existe nas contas, conta a conta, respeitando a
 * data de corte de cada uma — é o mesmo cálculo do bloco "Onde está meu
 * dinheiro", para os dois números nunca se contradizerem na mesma tela.
 *
 * Lançamento sem conta escolhida NÃO entra no saldo: se não se sabe de qual
 * conta o dinheiro saiu, ele não pode ter mudado o saldo de nenhuma. Ele
 * aparece como aviso, para o usuário escolher a conta.
 *
 * Aportes em meta também ficam de fora, como manda o handoff.
 */
export async function resumoDoMes(ano: number, mes: number): Promise<ResumoMes> {
  const supabase = await criarClienteServidor();
  const { de, ate } = limitesDoMes(ano, mes);

  const [todos, { data: contas }] = await Promise.all([
    todosOsMovimentos(),
    supabase
      .from("contas")
      .select("id, nome, cor, tipo, saldo_inicial, saldo_conferido_em")
      .eq("arquivada", false),
  ]);

  const movimentos = todos.filter((m) => m.data <= ate);
  const comSaldo = saldosPorConta(contas ?? [], movimentos);

  let receitas = 0;
  let despesas = 0;
  let pendentes = 0;

  for (const l of movimentos) {
    if (l.data < de) continue;
    if (l.incompleto) pendentes += 1;
    if (l.tipo === "receita") receitas += l.valor;
    else if (l.tipo === "despesa") despesas += l.valor;
  }

  return {
    acumulado: totalDasContas(comSaldo),
    resultado: receitas - despesas,
    receitas,
    despesas,
    pendentes,
    semConta: valorSemConta(movimentos),
  };
}
