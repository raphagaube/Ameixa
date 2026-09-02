import { describe, expect, it } from "vitest";
import { filtroOu, interpretarBusca } from "./busca";

describe("busca por valor", () => {
  /** O caso do pedido: procurar a conta de R$ 363,00 digitando 363. */
  it("número puro vira busca por valor", () => {
    expect(interpretarBusca("363")).toEqual({ texto: "363", valor: 363 });
  });

  it("entende o formato brasileiro", () => {
    expect(interpretarBusca("1.234,56").valor).toBe(1234.56);
    expect(interpretarBusca("363,00").valor).toBe(363);
  });

  it("aceita o símbolo da moeda colado", () => {
    expect(interpretarBusca("R$ 363").valor).toBe(363);
    expect(interpretarBusca("R$363,00").valor).toBe(363);
  });

  /** No banco o valor é sempre positivo; o sinal vem do tipo. */
  it("digitar com sinal negativo acha o mesmo lançamento", () => {
    expect(interpretarBusca("-363").valor).toBe(363);
  });

  it("espaços em volta não atrapalham", () => {
    expect(interpretarBusca("  363  ").valor).toBe(363);
  });
});

describe("busca por texto", () => {
  it("palavra continua sendo busca por descrição", () => {
    expect(interpretarBusca("Mercado")).toEqual({ texto: "Mercado", valor: null });
  });

  /** "Posto 24h" tem número, mas é nome de lugar, não valor. */
  it("texto com número no meio não vira busca por valor", () => {
    expect(interpretarBusca("Posto 24h").valor).toBeNull();
    expect(interpretarBusca("Loja 5 estrelas").valor).toBeNull();
  });

  it("campo vazio não busca nada", () => {
    expect(interpretarBusca("")).toEqual({ texto: null, valor: null });
    expect(interpretarBusca("   ")).toEqual({ texto: null, valor: null });
  });

  it("zero não vira filtro de valor: todo lançamento é maior que zero", () => {
    expect(interpretarBusca("0").valor).toBeNull();
    expect(interpretarBusca("0,00").valor).toBeNull();
  });
});

describe("filtro enviado ao banco", () => {
  it("procura na descrição e no valor ao mesmo tempo", () => {
    const f = filtroOu(interpretarBusca("363"));
    expect(f).toBe('descricao.ilike."*363*",valor.eq.363');
  });

  /**
   * A vírgula separa condições na sintaxe do PostgREST, e valor em
   * português é cheio delas. Sem as aspas, "1.234,56" quebraria a consulta.
   */
  it("protege a vírgula do valor entre aspas", () => {
    const f = filtroOu(interpretarBusca("1.234,56"));
    expect(f).toBe('descricao.ilike."*1.234,56*",valor.eq.1234.56');
  });

  it("aspas digitadas pelo usuário são removidas", () => {
    const f = filtroOu({ texto: 'a"b', valor: 10 });
    expect(f).not.toContain('a"b');
  });

  it("busca só por texto não usa o filtro combinado", () => {
    expect(filtroOu(interpretarBusca("Mercado"))).toBeNull();
  });
});
