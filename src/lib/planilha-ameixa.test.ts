import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { lerExcel } from "./excel";
import { CAMPOS, analisarLinhas, palpitarMapeamento } from "./importacao";
import type { ListasPlanilha } from "./listas-planilha";
import { gerarPlanilhaAmeixa } from "./planilha-ameixa";
import type { LancamentoNaLista } from "./tipos/lancamentos";

const listas: ListasPlanilha = {
  categorias: [{ nome: "Moradia", tipo: "despesa", subcategorias: ["Luz", "Água"] }],
  contas: ["PAG BANK"],
  formas: ["Pix"],
};

const lanc = (p: Partial<LancamentoNaLista>): LancamentoNaLista =>
  ({
    id: "x",
    tipo: "despesa",
    valor: 1234.56,
    descricao: "Luz Cpfl — 2/12",
    data_registro: "2026-09-12",
    data_vencimento: "2026-09-15",
    situacao: "a_pagar",
    categoria: { nome: "Moradia", cor: "", cor_texto: "" },
    subcategoria: { nome: "Luz" },
    conta: { nome: "PAG BANK" },
    cartao: null,
    forma_pagamento: "Pix",
    responsavel: "Rapha",
    observacao: "conta de setembro",
    ...p,
  }) as unknown as LancamentoNaLista;

describe("planilha do Ameixa", () => {
  it("modelo em branco: três abas, e o importador não lê as instruções", () => {
    const buf = gerarPlanilhaAmeixa([], listas);
    expect(XLSX.read(buf, { type: "array" }).SheetNames).toEqual([
      "Lançamentos",
      "Instruções",
      "Listas",
    ]);
    expect(lerExcel(buf)).toEqual([]);
  });

  /**
   * O teste que importa: o que sai do app, entra de novo igual. Passa pela
   * leitura de Excel e pelo motor de importação de verdade.
   */
  it("exportar e importar de volta devolve os mesmos dados", () => {
    const buf = gerarPlanilhaAmeixa(
      [
        lanc({}),
        lanc({
          tipo: "receita",
          situacao: "recebido",
          valor: 500,
          descricao: "Tecfusion",
          data_registro: "2026-08-17",
          data_vencimento: null,
          categoria: null,
          subcategoria: null,
          conta: null,
          forma_pagamento: null,
          responsavel: null,
          observacao: null,
        }),
      ],
      listas,
    );

    const linhas = lerExcel(buf);
    const mapa = palpitarMapeamento(Object.keys(linhas[0]));
    for (const { campo } of CAMPOS) expect(mapa[campo], campo).toBeDefined();

    const [luz, tecfusion] = analisarLinhas(linhas, mapa);
    expect(luz).toMatchObject({
      data: "2026-09-12",
      vencimento: "2026-09-15",
      descricao: "Luz Cpfl — 2/12",
      valor: 1234.56,
      tipo: "despesa",
      situacao: "a_pagar",
      categoriaTexto: "Moradia",
      subcategoriaTexto: "Luz",
      contaTexto: "PAG BANK",
      forma: "Pix",
      responsavel: "Rapha",
      observacao: "conta de setembro",
      problema: null,
    });
    expect(tecfusion).toMatchObject({
      data: "2026-08-17",
      vencimento: null,
      valor: 500,
      tipo: "receita",
      situacao: "recebido",
      contaTexto: "",
      forma: null,
      problema: null,
    });
  });

  it("pago continua pago na volta", () => {
    const [l] = analisarLinhas(
      lerExcel(gerarPlanilhaAmeixa([lanc({ situacao: "pago" })], listas)),
      palpitarMapeamento(COLUNAS_NORMALIZADAS),
    );
    expect(l.situacao).toBe("pago");
  });

  it("aporte em meta não vai para a planilha", () => {
    expect(lerExcel(gerarPlanilhaAmeixa([lanc({ tipo: "aporte" })], listas))).toEqual([]);
  });
});

const COLUNAS_NORMALIZADAS = [
  "data",
  "vencimento",
  "descricao",
  "valor",
  "tipo",
  "situacao",
  "categoria",
  "subcategoria",
  "conta",
  "forma de pagamento",
  "responsavel",
  "observacao",
];
