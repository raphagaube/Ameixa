import { afterEach, describe, expect, it, vi } from "vitest";
import {
  datasPorDoRelatorio,
  descreverFiltros,
  lerParametrosDoExtrato,
  nomeDoExtrato,
  totaisDoExtrato,
} from "./extrato-impresso";

const hoje = new Date(2026, 8, 30); // 30/09/2026

describe("lerParametrosDoExtrato", () => {
  it("sem nada no endereço, é o mês de hoje, pelo registro, mais novos primeiro", () => {
    expect(lerParametrosDoExtrato({}, hoje)).toMatchObject({
      periodo: "mes",
      de: "2026-09-01",
      ate: "2026-09-30",
      datasPor: "registro",
      ordem: "recentes",
    });
  });

  it("mês e ano escolhidos, com fevereiro de ano bissexto", () => {
    expect(lerParametrosDoExtrato({ ano: "2028", mes: "1" }, hoje)).toMatchObject({
      de: "2028-02-01",
      ate: "2028-02-29",
    });
  });

  it("ano inteiro e dia único", () => {
    expect(lerParametrosDoExtrato({ periodo: "ano", ano: "2025" }, hoje)).toMatchObject({
      de: "2025-01-01",
      ate: "2025-12-31",
    });
    expect(lerParametrosDoExtrato({ periodo: "dia", ano: "2026", mes: "8", dia: "13" }, hoje)).toMatchObject({
      de: "2026-09-13",
      ate: "2026-09-13",
    });
  });

  it("faixa invertida é desvirada; faixa sem as duas datas cai no mês", () => {
    expect(
      lerParametrosDoExtrato({ periodo: "faixa", de: "2026-09-30", ate: "2026-09-01" }, hoje),
    ).toMatchObject({ de: "2026-09-01", ate: "2026-09-30" });
    expect(lerParametrosDoExtrato({ periodo: "faixa", de: "2026-01-01" }, hoje)).toMatchObject({
      de: "2026-09-01",
      ate: "2026-09-30",
    });
  });

  it("datas=vencimento liga o filtro pelo vencimento; qualquer outra coisa, não", () => {
    expect(lerParametrosDoExtrato({ datas: "vencimento" }, hoje).datasPor).toBe("vencimento");
    expect(lerParametrosDoExtrato({ datas: "outra" }, hoje).datasPor).toBe("registro");
  });
});

describe("totaisDoExtrato", () => {
  it("soma receitas e despesas, e deixa o aporte fora das duas", () => {
    expect(
      totaisDoExtrato([
        { tipo: "receita", valor: 1000 },
        { tipo: "despesa", valor: 300.5 },
        { tipo: "despesa", valor: 99.5 },
        { tipo: "aporte", valor: 500 },
      ]),
    ).toEqual({ receitas: 1000, despesas: 400, saldo: 600, aportes: 1, quantidade: 4 });
  });

  it("lista vazia dá tudo zero", () => {
    expect(totaisDoExtrato([])).toEqual({ receitas: 0, despesas: 0, saldo: 0, aportes: 0, quantidade: 0 });
  });
});

describe("descreverFiltros", () => {
  it("só fala dos filtros ligados, com o rótulo da situação", () => {
    expect(descreverFiltros({})).toEqual([]);
    expect(
      descreverFiltros({ texto: "sindy", categoria: "JURÍDICO", situacao: "a_pagar", forma: "Pix" }),
    ).toEqual(['busca "sindy"', "categoria JURÍDICO", "situação a pagar", "forma de pagamento Pix"]);
  });

  it("situação desconhecida no endereço não vira texto quebrado", () => {
    expect(descreverFiltros({ situacao: "inventada" })).toEqual([]);
  });
});

describe("nomeDoExtrato", () => {
  it("leva o período no nome e termina em .pdf", () => {
    expect(nomeDoExtrato("2026-09-01", "2026-09-30")).toBe("extrato-ameixa-2026-09-01-a-2026-09-30.pdf");
  });
});

describe("datasPorDoRelatorio", () => {
  it("o relatório conta pelo vencimento, a menos que o endereço peça o registro", () => {
    expect(datasPorDoRelatorio(undefined)).toBe("vencimento");
    expect(datasPorDoRelatorio("qualquer")).toBe("vencimento");
    expect(datasPorDoRelatorio("registro")).toBe("registro");
  });
});

describe("o padrão de hoje é o dia de Brasília, não o do servidor", () => {
  afterEach(() => vi.useRealTimers());

  /**
   * Regressão: em 30/09/2026 às 22:57 de Brasília o extrato abriu em
   * outubro. O servidor roda em UTC, onde já era 01/10 à 01:57.
   */
  it("às 22:57 de 30/09 em Brasília, o mês padrão ainda é setembro", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T01:57:00Z"));
    expect(lerParametrosDoExtrato({})).toMatchObject({
      ano: 2026,
      mes: 8,
      dia: 30,
      de: "2026-09-01",
      ate: "2026-09-30",
    });
  });

  it("à meia-noite de Brasília o dia vira", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T03:00:00Z"));
    expect(lerParametrosDoExtrato({})).toMatchObject({ mes: 9, dia: 1, de: "2026-10-01" });
  });
});
