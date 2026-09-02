/**
 * Saldo de cada conta hoje.
 *
 * O saldo cadastrado é o ponto de partida; o saldo de verdade é ele mais
 * tudo que entrou e saiu daquela conta. Mostrar só o cadastrado faria a
 * tela de bancos mentir para sempre.
 *
 * Data de corte: quem importou anos de despesas mas não tem as receitas do
 * mesmo período informa o saldo real de hoje e a data em que conferiu. A
 * partir daí só os lançamentos POSTERIORES a essa data entram na conta. O
 * histórico continua inteiro nos relatórios; só para de poluir o saldo.
 */

export type MovimentoDeConta = {
  conta_id: string | null;
  tipo: string;
  valor: number;
  data: string;
};

export type ContaCadastrada = {
  id: string;
  nome: string;
  cor: string;
  tipo: string;
  saldo_inicial: number;
  saldo_conferido_em?: string | null;
};

export type ContaComSaldo = {
  id: string;
  nome: string;
  cor: string;
  tipo: string;
  saldoInicial: number;
  conferidoEm: string | null;
  entradas: number;
  saidas: number;
  saldo: number;
  /** Lançamentos anteriores ao corte, que ficaram de fora do saldo. */
  ignorados: number;
};

/**
 * Junta o saldo cadastrado de cada conta com o que se movimentou nela.
 *
 * Aportes em meta ficam de fora, como no resto do app: o dinheiro foi
 * separado para um objetivo, não saiu da sua vida.
 */
export function saldosPorConta(
  contas: ContaCadastrada[],
  movimentos: MovimentoDeConta[],
): ContaComSaldo[] {
  const corte = new Map(
    contas.map((c) => [c.id, c.saldo_conferido_em ?? null]),
  );

  const porConta = new Map<
    string,
    { entradas: number; saidas: number; ignorados: number }
  >();

  for (const m of movimentos) {
    if (!m.conta_id) continue;
    if (m.tipo !== "receita" && m.tipo !== "despesa") continue;

    const atual = porConta.get(m.conta_id) ?? {
      entradas: 0,
      saidas: 0,
      ignorados: 0,
    };

    // Comparação de texto funciona porque as datas são aaaa-mm-dd. O dia da
    // conferência entra no corte: o saldo informado já o inclui.
    const dataDoCorte = corte.get(m.conta_id) ?? null;
    if (dataDoCorte && m.data <= dataDoCorte) {
      atual.ignorados += 1;
    } else if (m.tipo === "receita") {
      atual.entradas += Number(m.valor);
    } else {
      atual.saidas += Number(m.valor);
    }

    porConta.set(m.conta_id, atual);
  }

  return contas.map((c) => {
    const mov = porConta.get(c.id) ?? { entradas: 0, saidas: 0, ignorados: 0 };
    const inicial = Number(c.saldo_inicial);
    return {
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      tipo: c.tipo,
      saldoInicial: inicial,
      conferidoEm: c.saldo_conferido_em ?? null,
      entradas: mov.entradas,
      saidas: mov.saidas,
      ignorados: mov.ignorados,
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
