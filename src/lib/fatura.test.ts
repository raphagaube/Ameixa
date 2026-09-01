import { describe, expect, it } from "vitest";
import {
  cicloDaFatura,
  estadoDoLimite,
  naFatura,
  percentualDoLimite,
} from "./fatura";

/**
 * Regra 5: a fatura não é o mês corrido. Compra feita depois do fechamento
 * cai na fatura seguinte. O protótipo agrupava por mês; aqui não.
 */
describe("ciclo da fatura", () => {
  it("cobre do dia seguinte ao fechamento anterior até o fechamento", () => {
    const c = cicloDaFatura(2026, 8, 28, 5); // setembro de 2026
    expect(c.de).toBe("2026-08-29");
    expect(c.ate).toBe("2026-09-28");
  });

  it("vence no mês seguinte quando o dia do vencimento é menor que o do fechamento", () => {
    expect(cicloDaFatura(2026, 8, 28, 5).vencimento).toBe("2026-10-05");
  });

  it("vence no mesmo mês quando o dia do vencimento é maior", () => {
    expect(cicloDaFatura(2026, 8, 5, 15).vencimento).toBe("2026-09-15");
  });

  /** Fechamento dia 31 num mês de 30 tem que virar 30, não escorregar. */
  it("prende o fechamento no último dia do mês curto", () => {
    expect(cicloDaFatura(2026, 3, 31, 10).ate).toBe("2026-04-30");
  });

  it("fevereiro não vira 31 nem 30", () => {
    expect(cicloDaFatura(2026, 1, 31, 10).ate).toBe("2026-02-28");
  });

  it("vira o ano corretamente em janeiro", () => {
    const c = cicloDaFatura(2026, 0, 28, 5);
    expect(c.de).toBe("2025-12-29");
    expect(c.ate).toBe("2026-01-28");
  });

  it("vira o ano no vencimento de dezembro", () => {
    expect(cicloDaFatura(2026, 11, 28, 5).vencimento).toBe("2027-01-05");
  });
});

describe("compra dentro da fatura", () => {
  const c = cicloDaFatura(2026, 8, 28, 5);

  it("compra no meio do ciclo entra", () => {
    expect(naFatura("2026-09-10", c)).toBe(true);
  });

  it("compra no dia do fechamento ainda entra", () => {
    expect(naFatura("2026-09-28", c)).toBe(true);
  });

  /** O caso que o handoff manda corrigir: um dia depois já é a próxima. */
  it("compra um dia depois do fechamento fica de fora", () => {
    expect(naFatura("2026-09-29", c)).toBe(false);
  });

  it("compra anterior ao início fica de fora", () => {
    expect(naFatura("2026-08-28", c)).toBe(false);
  });
});

describe("uso do limite", () => {
  it("abaixo de 70% fica verde", () => {
    expect(estadoDoLimite(690, 1000)).toBe("ok");
  });

  it("a partir de 70% vira âmbar", () => {
    expect(estadoDoLimite(700, 1000)).toBe("atencao");
  });

  it("a partir de 90% vira vermelho", () => {
    expect(estadoDoLimite(900, 1000)).toBe("estourando");
  });

  it("limite zero não divide por zero", () => {
    expect(estadoDoLimite(500, 0)).toBe("ok");
    expect(percentualDoLimite(500, 0)).toBe(0);
  });

  it("percentual arredonda", () => {
    expect(percentualDoLimite(333, 1000)).toBe(33);
  });
});
