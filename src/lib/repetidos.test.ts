import { describe, expect, it } from "vitest";
import { agruparRepetidos, idsParaMesclar } from "./repetidos";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

function lanc(
  id: string,
  descricao: string,
  valor: number,
  data: string,
  serieId: string | null = null,
): LancamentoNaLista {
  return {
    id,
    tipo: "despesa",
    valor,
    descricao,
    data_registro: data,
    data_vencimento: null,
    situacao: "pago",
    categoria_id: null,
    subcategoria_id: null,
    conta_id: null,
    cartao_id: null,
    forma_pagamento: null,
    responsavel: null,
    observacao: null,
    meta_id: null,
    serie_id: serieId,
    serie_tipo: null,
    parcela_atual: null,
    parcela_total: null,
    incompleto: false,
    categoria: null,
    subcategoria: null,
    conta: null,
    cartao: null,
  };
}

describe("agrupamento de repetidos", () => {
  it("junta mesmo valor e mesma descrição", () => {
    const g = agruparRepetidos([
      lanc("1", "Padaria", 32, "2026-09-01"),
      lanc("2", "Padaria", 32, "2026-09-01"),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].ocorrencias).toHaveLength(2);
  });

  it("não junta quando o valor difere", () => {
    expect(
      agruparRepetidos([
        lanc("1", "Padaria", 32, "2026-09-01"),
        lanc("2", "Padaria", 33, "2026-09-01"),
      ]),
    ).toHaveLength(0);
  });

  it("não junta quando a descrição difere", () => {
    expect(
      agruparRepetidos([
        lanc("1", "Padaria", 32, "2026-09-01"),
        lanc("2", "Mercado", 32, "2026-09-01"),
      ]),
    ).toHaveLength(0);
  });

  it("ignora maiúsculas e espaços na descrição", () => {
    expect(
      agruparRepetidos([
        lanc("1", "Padaria", 32, "2026-09-01"),
        lanc("2", "  PADARIA ", 32, "2026-09-02"),
      ]),
    ).toHaveLength(1);
  });

  /** Parcela e assinatura são série, não duplicata. */
  it("deixa lançamentos de série de fora", () => {
    expect(
      agruparRepetidos([
        lanc("1", "Netflix", 44.9, "2026-09-01", "S1"),
        lanc("2", "Netflix", 44.9, "2026-10-01", "S1"),
      ]),
    ).toHaveLength(0);
  });

  it("item sozinho não vira grupo", () => {
    expect(agruparRepetidos([lanc("1", "Padaria", 32, "2026-09-01")])).toHaveLength(0);
  });

  it("ordena as ocorrências da mais antiga para a mais nova", () => {
    const g = agruparRepetidos([
      lanc("novo", "Padaria", 32, "2026-09-05"),
      lanc("velho", "Padaria", 32, "2026-09-01"),
    ]);
    expect(g[0].ocorrencias.map((o) => o.id)).toEqual(["velho", "novo"]);
  });

  it("grupos maiores aparecem primeiro", () => {
    const g = agruparRepetidos([
      lanc("a1", "A", 10, "2026-09-01"),
      lanc("a2", "A", 10, "2026-09-02"),
      lanc("b1", "B", 20, "2026-09-01"),
      lanc("b2", "B", 20, "2026-09-02"),
      lanc("b3", "B", 20, "2026-09-03"),
    ]);
    expect(g[0].descricao).toBe("B");
  });
});

describe("mesclar", () => {
  it("marca todas menos a primeira", () => {
    const g = agruparRepetidos([
      lanc("velho", "Padaria", 32, "2026-09-01"),
      lanc("meio", "Padaria", 32, "2026-09-02"),
      lanc("novo", "Padaria", 32, "2026-09-03"),
    ]);
    expect(idsParaMesclar(g[0])).toEqual(["meio", "novo"]);
  });
});
