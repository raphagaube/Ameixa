import { describe, expect, it } from "vitest";
import { saldosPorConta, totalDasContas, valorSemConta } from "./saldo-conta";

const conta = (id: string, nome: string, inicial: number) => ({
  id,
  nome,
  cor: "#000000",
  tipo: "corrente",
  saldo_inicial: inicial,
});

const mov = (
  conta_id: string | null,
  tipo: string,
  valor: number,
  data = "2026-09-01",
) => ({ conta_id, tipo, valor, data });

describe("saldo de cada conta", () => {
  /** O problema relatado: a tela mostrava só o inicial e mentia. */
  it("desconta o que foi gasto na conta", () => {
    const r = saldosPorConta(
      [conta("pag", "Pag Bank", 4562.93)],
      [mov("pag", "despesa", 200)],
    );
    expect(r[0].saldo).toBe(4362.93);
  });

  it("soma o que entrou na conta", () => {
    const r = saldosPorConta([conta("a", "A", 100)], [mov("a", "receita", 900)]);
    expect(r[0].saldo).toBe(1000);
  });

  it("mostra entradas e saídas separadas", () => {
    const r = saldosPorConta(
      [conta("a", "A", 0)],
      [mov("a", "receita", 500), mov("a", "despesa", 120)],
    );
    expect(r[0].entradas).toBe(500);
    expect(r[0].saidas).toBe(120);
    expect(r[0].saldo).toBe(380);
  });

  /** Gasto no Pag Bank não pode aparecer no Mercado Pago. */
  it("não mistura o movimento de uma conta com o de outra", () => {
    const r = saldosPorConta(
      [conta("a", "A", 1000), conta("b", "B", 1000)],
      [mov("a", "despesa", 300)],
    );
    expect(r[0].saldo).toBe(700);
    expect(r[1].saldo).toBe(1000);
  });

  it("conta sem movimento fica no saldo inicial", () => {
    expect(saldosPorConta([conta("a", "A", 7008.44)], [])[0].saldo).toBe(7008.44);
  });

  it("preserva o saldo inicial para conferência", () => {
    const r = saldosPorConta([conta("a", "A", 100)], [mov("a", "despesa", 40)]);
    expect(r[0].saldoInicial).toBe(100);
  });

  it("fica negativo quando se gastou mais do que havia", () => {
    const r = saldosPorConta([conta("a", "A", 50)], [mov("a", "despesa", 200)]);
    expect(r[0].saldo).toBe(-150);
  });

  /** Regra do handoff: aporte não entra em saldo. */
  it("aporte não mexe no saldo da conta", () => {
    const r = saldosPorConta([conta("a", "A", 1000)], [mov("a", "aporte", 300)]);
    expect(r[0].saldo).toBe(1000);
  });

  it("lançamento sem conta não entra em conta nenhuma", () => {
    const r = saldosPorConta([conta("a", "A", 100)], [mov(null, "despesa", 999)]);
    expect(r[0].saldo).toBe(100);
  });

  it("valor vindo como texto do banco ainda soma certo", () => {
    const r = saldosPorConta(
      [{ ...conta("a", "A", 0), saldo_inicial: "100" as unknown as number }],
      [mov("a", "receita", "50" as unknown as number)],
    );
    expect(r[0].saldo).toBe(150);
  });
});

describe("total das contas", () => {
  it("soma o saldo de todas", () => {
    const r = saldosPorConta(
      [conta("a", "A", 1000), conta("b", "B", 500)],
      [mov("a", "despesa", 200)],
    );
    expect(totalDasContas(r)).toBe(1300);
  });

  it("sem contas, dá zero", () => {
    expect(totalDasContas([])).toBe(0);
  });
});

describe("dinheiro sem conta escolhida", () => {
  /**
   * Sem isso, o total das contas não bateria com o saldo do painel e a
   * diferença ficaria sem explicação nenhuma.
   */
  it("soma o que ficou fora das contas", () => {
    const m = [mov(null, "receita", 500), mov(null, "despesa", 200), mov("a", "despesa", 999)];
    expect(valorSemConta(m)).toBe(300);
  });

  it("tudo com conta dá zero", () => {
    expect(valorSemConta([mov("a", "receita", 100)])).toBe(0);
  });

  it("aporte sem conta também fica de fora", () => {
    expect(valorSemConta([mov(null, "aporte", 100)])).toBe(0);
  });
});

describe("data de corte do saldo", () => {
  /**
   * Caso real do dono: importou anos de despesas mas não tem as receitas do
   * mesmo período. Sem o corte, o saldo apareceria muito mais negativo do
   * que a realidade.
   */
  it("ignora o que aconteceu antes da data conferida", () => {
    const contas = [
      { ...conta("a", "Pag Bank", 4562.93), saldo_conferido_em: "2026-09-02" },
    ];
    const r = saldosPorConta(contas, [
      mov("a", "despesa", 9999, "2025-07-01"),
      mov("a", "despesa", 100, "2026-09-05"),
    ]);
    expect(r[0].saldo).toBe(4462.93);
  });

  it("conta quantos ficaram de fora, para a tela poder avisar", () => {
    const contas = [
      { ...conta("a", "A", 1000), saldo_conferido_em: "2026-09-02" },
    ];
    const r = saldosPorConta(contas, [
      mov("a", "despesa", 50, "2025-01-01"),
      mov("a", "despesa", 50, "2025-02-01"),
      mov("a", "receita", 200, "2026-09-10"),
    ]);
    expect(r[0].ignorados).toBe(2);
    expect(r[0].saldo).toBe(1200);
  });

  /** O saldo informado já inclui o próprio dia da conferência. */
  it("lançamento do mesmo dia do corte não é somado de novo", () => {
    const contas = [
      { ...conta("a", "A", 1000), saldo_conferido_em: "2026-09-02" },
    ];
    const r = saldosPorConta(contas, [mov("a", "despesa", 100, "2026-09-02")]);
    expect(r[0].saldo).toBe(1000);
    expect(r[0].ignorados).toBe(1);
  });

  it("o dia seguinte ao corte já conta", () => {
    const contas = [
      { ...conta("a", "A", 1000), saldo_conferido_em: "2026-09-02" },
    ];
    const r = saldosPorConta(contas, [mov("a", "despesa", 100, "2026-09-03")]);
    expect(r[0].saldo).toBe(900);
  });

  it("sem data de corte, tudo continua contando como antes", () => {
    const r = saldosPorConta(
      [conta("a", "A", 1000)],
      [mov("a", "despesa", 100, "2020-01-01")],
    );
    expect(r[0].saldo).toBe(900);
    expect(r[0].ignorados).toBe(0);
  });

  /** Cada conta tem a sua data; o corte de uma não vale para a outra. */
  it("o corte de uma conta não afeta a outra", () => {
    const contas = [
      { ...conta("a", "A", 1000), saldo_conferido_em: "2026-09-02" },
      conta("b", "B", 1000),
    ];
    const r = saldosPorConta(contas, [
      mov("a", "despesa", 500, "2025-01-01"),
      mov("b", "despesa", 500, "2025-01-01"),
    ]);
    expect(r[0].saldo).toBe(1000);
    expect(r[1].saldo).toBe(500);
  });

  it("guarda a data conferida para a tela mostrar", () => {
    const contas = [
      { ...conta("a", "A", 100), saldo_conferido_em: "2026-09-02" },
    ];
    expect(saldosPorConta(contas, [])[0].conferidoEm).toBe("2026-09-02");
  });
});
