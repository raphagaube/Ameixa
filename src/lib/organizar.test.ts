import { describe, expect, it } from "vitest";
import {
  agruparPorCategoriaOriginal,
  categoriaExistente,
  chaveDeComparacao,
  corParaNova,
  extrairCategoriaOriginal,
  nomeCurto,
  type PendenciaCrua,
} from "./organizar";

function p(
  id: string,
  observacao: string | null,
  valor = 10,
  tipo: PendenciaCrua["tipo"] = "despesa",
): PendenciaCrua {
  return { id, tipo, valor, observacao };
}

describe("recuperar a categoria da observação", () => {
  /** O assistente grava "descrição da planilha · CATEGORIA". */
  it("pega o último trecho", () => {
    expect(
      extrairCategoriaOriginal("Kalimera Hortifruti · ALIMENTAÇÃO (supermercado)"),
    ).toBe("ALIMENTAÇÃO (supermercado)");
  });

  it("sem separador, a observação inteira é o candidato", () => {
    expect(extrairCategoriaOriginal("MORADIA")).toBe("MORADIA");
  });

  it("observação vazia devolve null", () => {
    expect(extrairCategoriaOriginal(null)).toBeNull();
    expect(extrairCategoriaOriginal("")).toBeNull();
    expect(extrairCategoriaOriginal("  ·  ")).toBeNull();
  });
});

describe("nome curto", () => {
  it("tira a explicação entre parênteses", () => {
    expect(nomeCurto("ALIMENTAÇÃO (supermercado, padaria)")).toBe("ALIMENTAÇÃO");
  });

  it("mantém o & e a barra do nome", () => {
    expect(nomeCurto("ESTÉTICA & CUIDADOS")).toBe("ESTÉTICA & CUIDADOS");
    expect(nomeCurto("PATRIMÔNIO/JAZIGO")).toBe("PATRIMÔNIO/JAZIGO");
  });

  it("compara sem acento e sem caixa", () => {
    expect(chaveDeComparacao("REFEIÇÕES FORA (ifood)")).toBe("refeicoes fora");
  });
});

describe("agrupamento das pendências", () => {
  const lista = [
    p("1", "Mercado · ALIMENTAÇÃO (supermercado)", 100),
    p("2", "Padaria · ALIMENTAÇÃO (supermercado)", 50),
    p("3", "Ifood · REFEIÇÕES FORA (delivery)", 30),
    p("4", null, 10),
  ];

  it("junta os mesmos e ignora quem não tem observação", () => {
    const g = agruparPorCategoriaOriginal(lista);
    expect(g).toHaveLength(2);
    expect(g[0].nome).toBe("ALIMENTAÇÃO");
    expect(g[0].ids).toEqual(["1", "2"]);
  });

  it("soma os valores do grupo", () => {
    expect(agruparPorCategoriaOriginal(lista)[0].soma).toBe(150);
  });

  it("ordena do grupo maior para o menor", () => {
    const g = agruparPorCategoriaOriginal(lista);
    expect(g.map((x) => x.nome)).toEqual(["ALIMENTAÇÃO", "REFEIÇÕES FORA"]);
  });

  /** Uma categoria no app é de um tipo só; misturar quebraria o extrato. */
  it("separa despesa de receita com o mesmo nome", () => {
    const g = agruparPorCategoriaOriginal([
      p("1", "x · OUTROS", 10, "despesa"),
      p("2", "y · OUTROS", 10, "receita"),
    ]);
    expect(g).toHaveLength(2);
    expect(new Set(g.map((x) => x.tipo))).toEqual(new Set(["despesa", "receita"]));
  });

  it("aporte fica de fora: ele não tem categoria", () => {
    expect(agruparPorCategoriaOriginal([p("1", "x · META", 10, "aporte")])).toHaveLength(0);
  });

  it("acentuação diferente não cria dois grupos", () => {
    const g = agruparPorCategoriaOriginal([
      p("1", "a · SAÚDE", 10),
      p("2", "b · saude", 10),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].ids).toHaveLength(2);
  });
});

describe("categoria já existente no app", () => {
  const cats = [
    { id: "c1", nome: "Alimentação", tipo: "despesa" as const },
    { id: "c2", nome: "Salário", tipo: "receita" as const },
  ];

  it("acha ignorando caixa e acento", () => {
    expect(categoriaExistente("ALIMENTAÇÃO (supermercado)", "despesa", cats)).toBe("c1");
  });

  it("não cruza os tipos", () => {
    expect(categoriaExistente("Alimentação", "receita", cats)).toBeNull();
  });

  it("nome novo devolve null, para o app saber que precisa criar", () => {
    expect(categoriaExistente("VESTUÁRIO", "despesa", cats)).toBeNull();
  });
});

describe("cor das categorias novas", () => {
  it("categorias vizinhas recebem cores diferentes", () => {
    expect(corParaNova(0)).not.toBe(corParaNova(1));
  });

  it("dá a volta sem quebrar quando passa do fim da lista", () => {
    expect(corParaNova(100)).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
