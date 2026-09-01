import { describe, expect, it } from "vitest";
import {
  dataBr,
  dataDoBanco,
  mesAno,
  moeda,
  moedaCurta,
  moedaOuOculto,
  paraIso,
} from "./formato";

/** O Intl usa espaço estreito não separável depois do R$; normaliza para comparar. */
const limpo = (s: string) => s.replace(/ | /g, " ");

describe("moeda pt-BR", () => {
  it("formata com R$, ponto de milhar e vírgula decimal", () => {
    expect(limpo(moeda(1234.56))).toBe("R$ 1.234,56");
  });

  it("formata zero", () => {
    expect(limpo(moeda(0))).toBe("R$ 0,00");
  });

  it("formata negativo", () => {
    expect(limpo(moeda(-89.9))).toBe("-R$ 89,90");
  });
});

describe("forma curta das barras do gráfico", () => {
  it("abrevia milhares com uma casa", () => {
    expect(moedaCurta(5200)).toBe("5,2k");
  });

  it("a partir de dez mil, dispensa a casa decimal", () => {
    expect(moedaCurta(12400)).toBe("12k");
  });

  it("abaixo de mil, mostra o número inteiro", () => {
    expect(moedaCurta(430)).toBe("430");
  });
});

describe("ocultar valores no relatório", () => {
  it("troca o valor pela máscara quando pedido", () => {
    expect(moedaOuOculto(1234.56, true)).toBe("••••••");
  });

  it("mostra o valor quando não é para ocultar", () => {
    expect(limpo(moedaOuOculto(1234.56, false))).toBe("R$ 1.234,56");
  });
});

describe("datas", () => {
  /**
   * Regressão: new Date('2026-09-01') é lido como UTC e volta 31/08 em
   * qualquer fuso negativo — o Brasil inteiro. Tem que ser data local.
   */
  it("lê data do banco sem voltar um dia", () => {
    const d = dataDoBanco("2026-09-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(1);
  });

  it("formata em dd/mm/aaaa", () => {
    expect(dataBr("2026-09-01")).toBe("01/09/2026");
    expect(dataBr(new Date(2026, 11, 25))).toBe("25/12/2026");
  });

  it("volta para ISO sem perder o dia", () => {
    expect(paraIso(dataDoBanco("2026-01-31"))).toBe("2026-01-31");
  });

  it("nomeia o mês em português", () => {
    expect(mesAno(new Date(2026, 8, 15))).toBe("Setembro 2026");
    expect(mesAno(new Date(2026, 2, 1))).toBe("Março 2026");
  });
});
