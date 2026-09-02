import { describe, expect, it } from "vitest";
import { calcularSaldos } from "./saldo";

const r = (valor: number) => ({ tipo: "receita", valor });
const d = (valor: number) => ({ tipo: "despesa", valor });
const a = (valor: number) => ({ tipo: "aporte", valor });

describe("saldo acumulado", () => {
  it("parte do saldo inicial das contas", () => {
    expect(calcularSaldos(1000, [], []).acumulado).toBe(1000);
  });

  it("soma tudo que entrou e tira tudo que saiu", () => {
    const s = calcularSaldos(1000, [r(500), d(200)], []);
    expect(s.acumulado).toBe(1300);
  });

  /** O ponto do pedido: o que sobrou de agosto aparece em setembro. */
  it("carrega o resultado dos meses anteriores", () => {
    // Agosto sobrou 2000; setembro gastou 300.
    const ate = [r(5000), d(3000), d(300)];
    const s = calcularSaldos(0, ate, [d(300)]);
    expect(s.acumulado).toBe(1700);
    expect(s.resultadoDoMes).toBe(-300);
  });

  it("fica negativo quando se gastou mais do que se tinha", () => {
    expect(calcularSaldos(100, [d(500)], [d(500)]).acumulado).toBe(-400);
  });
});

describe("resultado do mês", () => {
  it("olha só o mês escolhido, não a vida inteira", () => {
    const s = calcularSaldos(0, [r(5000), d(1000), d(200)], [d(200)]);
    expect(s.resultadoDoMes).toBe(-200);
  });

  it("separa receitas e despesas do mês", () => {
    const s = calcularSaldos(0, [], [r(900), d(400)]);
    expect(s.receitasDoMes).toBe(900);
    expect(s.despesasDoMes).toBe(400);
    expect(s.resultadoDoMes).toBe(500);
  });

  it("mês sem movimento dá zero, e o acumulado não muda", () => {
    const s = calcularSaldos(1500, [r(1500)], []);
    expect(s.resultadoDoMes).toBe(0);
    expect(s.acumulado).toBe(3000);
  });
});

describe("aportes em meta", () => {
  /**
   * Regra inviolável do handoff: aporte não entra em despesa, saldo nem
   * relatório. O dinheiro mudou de lugar, não saiu da sua vida.
   */
  it("não reduzem o saldo acumulado", () => {
    expect(calcularSaldos(1000, [a(300)], [a(300)]).acumulado).toBe(1000);
  });

  it("não entram no resultado do mês", () => {
    const s = calcularSaldos(0, [r(100), a(50)], [r(100), a(50)]);
    expect(s.resultadoDoMes).toBe(100);
    expect(s.despesasDoMes).toBe(0);
  });
});

describe("bordas", () => {
  it("sem contas cadastradas, começa do zero", () => {
    expect(calcularSaldos(0, [], []).acumulado).toBe(0);
  });

  it("valor vindo como texto do banco ainda soma certo", () => {
    const s = calcularSaldos(0, [{ tipo: "receita", valor: "100" as unknown as number }], []);
    expect(s.acumulado).toBe(100);
  });

  it("saldo inicial negativo é respeitado", () => {
    expect(calcularSaldos(-200, [r(500)], []).acumulado).toBe(300);
  });
});
