import { describe, expect, it } from "vitest";
import {
  detectarSeparador,
  lerCsv,
  lerData,
  lerLinhaCsv,
  lerNumero,
  mapearLancamentos,
} from "./csv";

describe("separador", () => {
  it("prefere ponto e vírgula, que é o padrão do Excel em português", () => {
    expect(detectarSeparador("a;b;c")).toBe(";");
  });

  it("cai na vírgula quando não há ponto e vírgula", () => {
    expect(detectarSeparador("a,b,c")).toBe(",");
  });
});

describe("linha de CSV", () => {
  it("separa campos simples", () => {
    expect(lerLinhaCsv("a;b;c", ";")).toEqual(["a", "b", "c"]);
  });

  /** Descrição com ponto e vírgula dentro não pode quebrar a coluna. */
  it("respeita o separador dentro de aspas", () => {
    expect(lerLinhaCsv('a;"b;c";d', ";")).toEqual(["a", "b;c", "d"]);
  });

  it("entende aspas duplicadas como aspa literal", () => {
    expect(lerLinhaCsv('"disse ""oi""";x', ";")).toEqual(['disse "oi"', "x"]);
  });

  it("campo vazio continua sendo um campo", () => {
    expect(lerLinhaCsv("a;;c", ";")).toEqual(["a", "", "c"]);
  });
});

describe("número", () => {
  it("lê o formato brasileiro", () => {
    expect(lerNumero("1.234,56")).toBe(1234.56);
  });

  it("lê o formato americano", () => {
    expect(lerNumero("1234.56")).toBe(1234.56);
  });

  it("ignora o símbolo da moeda", () => {
    expect(lerNumero("R$ 89,90")).toBe(89.9);
  });

  it("preserva o negativo", () => {
    expect(lerNumero("-50,00")).toBe(-50);
  });

  it("texto sem número devolve null", () => {
    expect(lerNumero("abc")).toBeNull();
    expect(lerNumero("")).toBeNull();
  });
});

describe("data", () => {
  it("lê dd/mm/aaaa", () => {
    expect(lerData("01/09/2026")).toBe("2026-09-01");
  });

  it("aceita dia e mês com um dígito", () => {
    expect(lerData("1/9/2026")).toBe("2026-09-01");
  });

  it("lê aaaa-mm-dd", () => {
    expect(lerData("2026-09-01")).toBe("2026-09-01");
  });

  it("rejeita o que não é data", () => {
    expect(lerData("ontem")).toBeNull();
  });
});

describe("CSV inteiro", () => {
  it("usa a primeira linha como cabeçalho", () => {
    const r = lerCsv("Data;Valor\n01/09/2026;10,00");
    expect(r).toHaveLength(1);
    expect(r[0]["data"]).toBe("01/09/2026");
  });

  it("ignora o BOM que o Excel escreve", () => {
    const r = lerCsv("﻿Data;Valor\n01/09/2026;10,00");
    expect(r[0]["data"]).toBe("01/09/2026");
  });

  it("tira o acento do cabeçalho, para Descrição e descricao valerem igual", () => {
    const r = lerCsv("Descrição;Valor\nPadaria;10");
    expect(r[0]["descricao"]).toBe("Padaria");
  });

  it("arquivo só com cabeçalho devolve lista vazia", () => {
    expect(lerCsv("Data;Valor")).toEqual([]);
  });
});

describe("mapeamento para lançamento", () => {
  it("lê o arquivo que a nossa própria exportação gera", () => {
    const linhas = lerCsv(
      "Data;Descrição;Tipo;Valor\n01/09/2026;Mercado;despesa;218,40",
    );
    const r = mapearLancamentos(linhas);
    expect(r).toEqual([
      {
        tipo: "despesa",
        valor: 218.4,
        descricao: "Mercado",
        data_registro: "2026-09-01",
        responsavel: null,
        observacao: null,
      },
    ]);
  });

  it("sem coluna de tipo, o sinal do valor decide", () => {
    const r = mapearLancamentos(lerCsv("Data;Descrição;Valor\n01/09/2026;Salário;5200"));
    expect(r[0].tipo).toBe("receita");
    const d = mapearLancamentos(lerCsv("Data;Descrição;Valor\n01/09/2026;Mercado;-50"));
    expect(d[0].tipo).toBe("despesa");
  });

  it("guarda o valor sempre positivo; o sinal vem do tipo", () => {
    const r = mapearLancamentos(lerCsv("Data;Descrição;Valor\n01/09/2026;Mercado;-50"));
    expect(r[0].valor).toBe(50);
  });

  it("descarta linha sem data, sem valor ou sem descrição", () => {
    expect(
      mapearLancamentos(lerCsv("Data;Descrição;Valor\n;Mercado;10")),
    ).toHaveLength(0);
    expect(
      mapearLancamentos(lerCsv("Data;Descrição;Valor\n01/09/2026;;10")),
    ).toHaveLength(0);
    expect(
      mapearLancamentos(lerCsv("Data;Descrição;Valor\n01/09/2026;Mercado;0")),
    ).toHaveLength(0);
  });
});
