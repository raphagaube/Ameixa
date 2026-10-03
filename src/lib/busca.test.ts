import { describe, expect, it } from "vitest";
import { filtroOu, filtroPeloVencimento, interpretarBusca, padraoSemAcento } from "./busca";

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
    expect(f).toBe('descricao.imatch."363",valor.eq.363');
  });

  /**
   * A vírgula separa condições na sintaxe do PostgREST, e valor em
   * português é cheio delas. Sem as aspas, "1.234,56" quebraria a consulta.
   */
  it("protege a vírgula do valor entre aspas, e o ponto vira ponto de verdade", () => {
    const f = filtroOu(interpretarBusca("1.234,56"));
    expect(f).toBe('descricao.imatch."1[.]234,56",valor.eq.1234.56');
  });

  it("aspas digitadas pelo usuário são removidas", () => {
    const f = filtroOu({ texto: 'a"b', valor: 10 });
    expect(f).not.toContain('a"b');
  });

  it("busca só por texto não usa o filtro combinado", () => {
    expect(filtroOu(interpretarBusca("Mercado"))).toBeNull();
  });
});

describe("período pelo vencimento", () => {
  it("vale o vencimento, e o registro para quem não tem vencimento", () => {
    expect(filtroPeloVencimento("2026-10-01", "2026-10-31")).toBe(
      "and(data_vencimento.gte.2026-10-01,data_vencimento.lte.2026-10-31)," +
        "and(data_vencimento.is.null,data_registro.gte.2026-10-01,data_registro.lte.2026-10-31)",
    );
  });

  it("com um lado só do período, não sobra vírgula solta", () => {
    expect(filtroPeloVencimento(undefined, "2026-10-31")).toBe(
      "and(data_vencimento.lte.2026-10-31),and(data_vencimento.is.null,data_registro.lte.2026-10-31)",
    );
  });
});

describe("busca sem acento", () => {
  /** O mesmo padrão, lido pelo JavaScript: os colchetes valem igual no Postgres. */
  const acha = (digitado: string, descricao: string) =>
    new RegExp(padraoSemAcento(digitado), "i").test(descricao);

  it("o que se digita sem acento acha o que está escrito com acento", () => {
    expect(acha("claudia", "Dra Cláudia limpeza de pele e drenagens")).toBe(true);
    expect(acha("agua", "DAE conta de água")).toBe(true);
    expect(acha("Agua", "Água")).toBe(true);
    expect(acha("acucar", "Pão de Açúcar")).toBe(true);
  });

  it("o que se digita com acento acha o que está escrito sem", () => {
    expect(acha("Cláudia", "dra claudia")).toBe(true);
    expect(acha("açúcar", "Pao de Acucar")).toBe(true);
  });

  it("continua achando só o que contém o texto", () => {
    expect(acha("claudia", "Clara")).toBe(false);
    expect(acha("agua", "Aguardente")).toBe(true); // "agua" está dentro, como no ilike
    expect(acha("sindy", "Kalimera")).toBe(false);
  });

  it("parênteses, ponto e outros sinais são procurados ao pé da letra", () => {
    expect(acha("(9/12)", "Sindy escritório (9/12)")).toBe(true);
    expect(acha("(9/12)", "Sindy escritório (10/12)")).toBe(false);
    expect(acha("C&A", "C&A roupas (9/12)")).toBe(true);
    expect(acha("1.234", "Compra 1.234 unidades")).toBe(true);
    expect(acha("1.234", "Compra 1x234")).toBe(false);
  });

  it("gera o padrão esperado, com as variantes entre colchetes", () => {
    expect(padraoSemAcento("agua")).toBe("[aáàâãäAÁÀÂÃÄ]g[uúùûüUÚÙÛÜ][aáàâãäAÁÀÂÃÄ]");
    expect(padraoSemAcento("x.y")).toBe("x[.]y");
  });

  it("tira o que quebraria a sintaxe do PostgREST ou da expressão", () => {
    expect(padraoSemAcento('a"b\\c]d^e')).toBe("[aáàâãäAÁÀÂÃÄ]b[cçCÇ]d[eéèêëEÉÈÊË]");
    expect(padraoSemAcento("  dois   espaços ")).toBe(
      "d[oóòôõöOÓÒÔÕÖ][iíìîïIÍÌÎÏ]s [eéèêëEÉÈÊË]sp[aáàâãäAÁÀÂÃÄ][cçCÇ][oóòôõöOÓÒÔÕÖ]s",
    );
  });

  it("texto que vira nada não derruba a busca por valor", () => {
    expect(filtroOu({ texto: '"', valor: 10 })).toBe("valor.eq.10");
  });
});
