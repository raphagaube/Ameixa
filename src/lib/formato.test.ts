import { describe, expect, it } from "vitest";
import {
  dataBr,
  dataDoBanco,
  hojeEmBrasilia,
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

describe("hoje em Brasília", () => {
  const dia = (instante: string) => paraIso(hojeEmBrasilia(new Date(instante)));

  /**
   * Regressão: o servidor roda em UTC. Às 22:57 de 30/09 em Brasília ele já
   * estava em 01/10, e o app abria no mês seguinte.
   */
  it("das 21h à meia-noite de Brasília ainda é o mesmo dia", () => {
    expect(dia("2026-10-01T00:00:00Z")).toBe("2026-09-30"); // 21:00 de 30/09
    expect(dia("2026-10-01T01:57:00Z")).toBe("2026-09-30"); // 22:57 de 30/09
    expect(dia("2026-10-01T02:59:59Z")).toBe("2026-09-30"); // 23:59:59
  });

  it("vira o dia à meia-noite de Brasília, não à do servidor", () => {
    expect(dia("2026-10-01T03:00:00Z")).toBe("2026-10-01");
    expect(dia("2026-10-01T15:00:00Z")).toBe("2026-10-01");
  });

  it("na virada do ano, o ano também é o de Brasília", () => {
    expect(dia("2027-01-01T02:30:00Z")).toBe("2026-12-31");
    expect(hojeEmBrasilia(new Date("2027-01-01T02:30:00Z")).getFullYear()).toBe(2026);
  });

  it("devolve meia-noite local, para comparar e somar dias sem surpresa", () => {
    const d = hojeEmBrasilia(new Date("2026-10-01T15:00:00Z"));
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });
});
