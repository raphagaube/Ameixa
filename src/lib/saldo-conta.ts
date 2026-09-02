/**
 * Saldo de cada conta hoje.
 *
 * O saldo cadastrado é o ponto de partida; o saldo de verdade é ele mais
 * tudo que entrou e saiu daquela conta. Mostrar só o inicial faria a tela
 * de bancos mentir para sempre.
 */

export type MovimentoDeConta = {
  conta_id: string | null;
  tipo: string;
  valor: number;
};

export type ContaComSaldo = {
  id: string;
  nome: string;
  cor: string;
  tipo: string;
  saldoInicial: number;
  entradas: number;
  saidas: number;
  saldo: number;
};

/**
 * Junta o saldo inicial de cada conta com o que se movimentou nela.
 *
 * Aportes em meta ficam de fora, como no resto do app: o dinheiro foi
 * separado para um objetivo, não saiu da sua vida.
 */
export function saldosPorConta(
  contas: { id: string; nome: string; cor: string; tipo: string; saldo_inicial: number }[],
  movimentos: MovimentoDeConta[],
): ContaComSaldo[] {
  const porConta = new Map<string, { entradas: number; saidas: number }>();

  for (const m of movimentos) {
    if (!m.conta_id) continue;
    if (m.tipo !== "receita" && m.tipo !== "despesa") continue;

    const atual = porConta.get(m.conta_id) ?? { entradas: 0, saidas: 0 };
    if (m.tipo === "receita") atual.entradas += Number(m.valor);
    else atual.saidas += Number(m.valor);
    porConta.set(m.conta_id, atual);
  }

  return contas.map((c) => {
    const mov = porConta.get(c.id) ?? { entradas: 0, saidas: 0 };
    const inicial = Number(c.saldo_inicial);
    return {
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      tipo: c.tipo,
      saldoInicial: inicial,
      entradas: mov.entradas,
      saidas: mov.saidas,
      saldo: inicial + mov.entradas - mov.saidas,
    };
  });
}

/** Quanto existe somando todas as contas. */
export function totalDasContas(contas: ContaComSaldo[]): number {
  return contas.reduce((s, c) => s + c.saldo, 0);
}

/**
 * Lançamentos sem conta escolhida não aparecem em conta nenhuma, e por isso
 * o total das contas pode não bater com o saldo do painel. A tela avisa
 * quando isso acontece em vez de deixar a diferença sem explicação.
 */
export function valorSemConta(movimentos: MovimentoDeConta[]): number {
  let n = 0;
  for (const m of movimentos) {
    if (m.conta_id) continue;
    if (m.tipo === "receita") n += Number(m.valor);
    else if (m.tipo === "despesa") n -= Number(m.valor);
  }
  return n;
}
