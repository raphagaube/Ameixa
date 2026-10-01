import { describe, expect, it } from "vitest";
import { montarPdfExtrato, type ConteudoExtrato } from "./pdf-extrato";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

function lanc(i: number, tipo: LancamentoNaLista["tipo"] = "despesa"): LancamentoNaLista {
  return {
    id: `l${i}`,
    tipo,
    valor: 10 + i,
    descricao: `Lançamento número ${i}`,
    data_registro: "2026-09-05",
    data_vencimento: i % 2 === 0 ? "2026-09-12" : null,
    situacao: tipo === "receita" ? "recebido" : tipo === "aporte" ? "guardado" : "a_pagar",
    categoria_id: null,
    subcategoria_id: null,
    conta_id: null,
    cartao_id: null,
    forma_pagamento: null,
    responsavel: null,
    observacao: null,
    meta_id: null,
    serie_id: null,
    serie_tipo: null,
    parcela_atual: null,
    parcela_total: null,
    incompleto: false,
    categoria: i % 3 === 0 ? { nome: "JURÍDICO", cor: "#8FB3D9", cor_texto: "#14161a" } : null,
    subcategoria: i % 6 === 0 ? { nome: "Cartório" } : null,
    conta: null,
    cartao: null,
  } as LancamentoNaLista;
}

const base: ConteudoExtrato = {
  nome: "Mimi",
  de: "2026-09-01",
  ate: "2026-09-30",
  datasPor: "registro",
  filtros: [],
  ocultar: false,
  lancamentos: [lanc(1), lanc(2, "receita"), lanc(3, "aporte")],
  cortado: false,
};

async function texto(blob: Blob) {
  return new TextDecoder("latin1").decode(await blob.arrayBuffer());
}

/** Quantas páginas o PDF tem, pelo catálogo do próprio arquivo. */
async function paginas(blob: Blob) {
  return Number((await texto(blob)).match(/\/Count (\d+)/)?.[1]);
}

describe("PDF do extrato", () => {
  it("gera um arquivo PDF válido e leve", async () => {
    const blob = await montarPdfExtrato(base);
    expect((await texto(blob)).slice(0, 5)).toBe("%PDF-");
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.size).toBeLessThan(200_000);
  });

  it("lista vazia também vira documento, em uma página", async () => {
    const blob = await montarPdfExtrato({ ...base, lancamentos: [] });
    expect(await paginas(blob)).toBe(1);
  });

  it("lista longa quebra em várias páginas", async () => {
    const blob = await montarPdfExtrato({
      ...base,
      datasPor: "vencimento",
      filtros: ['busca "sindy"', "categoria JURÍDICO", "situação a pagar"],
      lancamentos: Array.from({ length: 300 }, (_, i) => lanc(i)),
      cortado: true,
    });
    expect(await paginas(blob)).toBeGreaterThan(5);
  });
});
