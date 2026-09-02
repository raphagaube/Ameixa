/**
 * Saldo acumulado e resultado do mês.
 *
 * São duas perguntas diferentes e as duas importam:
 * - "quanto eu tenho"      → saldo acumulado, responde se dá para comprar hoje
 * - "quanto sobrou no mês" → resultado, responde se o mês está indo bem
 *
 * Aportes em meta ficam de fora dos dois, como manda o handoff: o dinheiro
 * mudou de lugar, não saiu da sua vida.
 */

export type Movimento = { tipo: string; valor: number };

export type Saldos = {
  /** Soma de tudo até o fim do mês, partindo do saldo inicial das contas. */
  acumulado: number;
  /** Receitas menos despesas apenas do mês escolhido. */
  resultadoDoMes: number;
  receitasDoMes: number;
  despesasDoMes: number;
};

function somar(movimentos: Movimento[]) {
  let receitas = 0;
  let despesas = 0;
  for (const m of movimentos) {
    // 'aporte' cai fora de propósito.
    if (m.tipo === "receita") receitas += Number(m.valor);
    else if (m.tipo === "despesa") despesas += Number(m.valor);
  }
  return { receitas, despesas };
}

/**
 * @param saldoInicialDasContas ponto de partida, antes do primeiro lançamento
 * @param ateOFimDoMes tudo que aconteceu até o último dia do mês escolhido
 * @param apenasDoMes o que aconteceu dentro do mês escolhido
 */
export function calcularSaldos(
  saldoInicialDasContas: number,
  ateOFimDoMes: Movimento[],
  apenasDoMes: Movimento[],
): Saldos {
  const tudo = somar(ateOFimDoMes);
  const mes = somar(apenasDoMes);

  return {
    acumulado: saldoInicialDasContas + tudo.receitas - tudo.despesas,
    resultadoDoMes: mes.receitas - mes.despesas,
    receitasDoMes: mes.receitas,
    despesasDoMes: mes.despesas,
  };
}
