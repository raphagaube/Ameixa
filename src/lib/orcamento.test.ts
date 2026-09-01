import { describe, expect, it } from "vitest";
import { estadoDoOrcamento, percentualDoOrcamento } from "./tipos/orcamentos";

/** Regra 6 do modelo de dados: <80% ok, 80–99 quase, >=100 ultrapassou. */
describe("estado do orçamento", () => {
  it("abaixo de 80% fica verde", () => {
    expect(estadoDoOrcamento(0, 1000)).toBe("ok");
    expect(estadoDoOrcamento(799, 1000)).toBe("ok");
  });

  it("exatamente 80% já vira âmbar", () => {
    expect(estadoDoOrcamento(800, 1000)).toBe("quase");
  });

  it("99% ainda é âmbar", () => {
    expect(estadoDoOrcamento(999, 1000)).toBe("quase");
  });

  it("exatamente 100% vira vermelho", () => {
    expect(estadoDoOrcamento(1000, 1000)).toBe("ultrapassou");
  });

  it("acima de 100% continua vermelho", () => {
    expect(estadoDoOrcamento(1500, 1000)).toBe("ultrapassou");
  });

  it("limite zero não quebra nem vira divisão por zero", () => {
    expect(estadoDoOrcamento(50, 0)).toBe("ok");
    expect(percentualDoOrcamento(50, 0)).toBe(0);
  });
});

describe("percentual do orçamento", () => {
  it("arredonda para inteiro", () => {
    expect(percentualDoOrcamento(333, 1000)).toBe(33);
  });

  it("passa de 100 quando estourou, para o texto poder mostrar", () => {
    expect(percentualDoOrcamento(1500, 1000)).toBe(150);
  });
});
