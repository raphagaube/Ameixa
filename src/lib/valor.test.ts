import { describe, expect, it } from "vitest";
import { escreverValor, lerValor } from "./valor";

describe("leitura do campo de dinheiro", () => {
  it("entende o formato brasileiro com milhar", () => {
    expect(lerValor("1.234,56")).toBe(1234.56);
  });

  it("entende sem separador de milhar", () => {
    expect(lerValor("1234,56")).toBe(1234.56);
  });

  it("entende ponto como decimal, para quem digita do jeito americano", () => {
    expect(lerValor("1234.56")).toBe(1234.56);
  });

  it("trata vazio como zero", () => {
    expect(lerValor("")).toBe(0);
    expect(lerValor("   ")).toBe(0);
  });

  it("ignora o símbolo da moeda coloado junto", () => {
    expect(lerValor("R$ 89,90")).toBe(89.9);
  });

  /**
   * Armadilha nº 3 do handoff: estados intermediários da digitação precisam
   * sobreviver. Se "12," virasse 12 na hora, apagar a vírgula seria impossível.
   */
  it("aceita os estados no meio da digitação", () => {
    expect(lerValor("12,")).toBe(12);
    expect(lerValor("12,5")).toBe(12.5);
    expect(lerValor("0")).toBe(0);
  });

  it("devolve null quando não dá para entender", () => {
    expect(lerValor("abc")).toBeNull();
  });
});

describe("escrita no campo de dinheiro", () => {
  it("usa vírgula como decimal", () => {
    expect(escreverValor(1234.56)).toBe("1234,56");
  });

  it("deixa o campo vazio quando o valor é zero", () => {
    expect(escreverValor(0)).toBe("");
  });

  it("completa as duas casas", () => {
    expect(escreverValor(89.9)).toBe("89,90");
  });

  it("volta pelo mesmo caminho que veio", () => {
    expect(lerValor(escreverValor(4321.09))).toBe(4321.09);
  });
});
