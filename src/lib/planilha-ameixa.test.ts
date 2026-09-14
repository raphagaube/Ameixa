import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { lerExcel } from "./excel";
import { CAMPOS, analisarLinhas, palpitarMapeamento } from "./importacao";
import type { ListasPlanilha } from "./listas-planilha";
import { gerarPlanilhaAmeixa } from "./planilha-ameixa";
import { lerPlanilhaDoAmeixa } from "./planilha-ameixa-leitura";
import type { LancamentoNaLista } from "./tipos/lancamentos";

const listas: ListasPlanilha = {
  categorias: [
    {
      id: "cat-moradia",
      nome: "Moradia",
      tipo: "despesa",
      subcategorias: [
        { id: "sub-luz", nome: "Luz" },
        { id: "sub-agua", nome: "Água" },
      ],
    },
  ],
  contas: [{ id: "conta-pag", nome: "PAG BANK" }],
  formas: ["Pix"],
};

const lanc = (p: Partial<LancamentoNaLista>): LancamentoNaLista =>
  ({
    id: "lanc-1",
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
  it("modelo em branco: abas na ordem, e o importador não lê as de apoio", () => {
    const buf = gerarPlanilhaAmeixa([], listas);
    expect(XLSX.read(buf, { type: "array" }).SheetNames).toEqual([
      "Lançamentos",
      "Instruções",
      "Categorias",
      "Contas",
      "Formas",
    ]);
    expect(lerExcel(buf)).toEqual([]);
  });

  /**
   * O que sai do app entra de novo igual, pela leitura de Excel e pelo motor
   * de importação de verdade — agora com o código de cada linha junto.
   */
  it("exportar e ler de volta devolve os mesmos dados e o código", () => {
    const buf = gerarPlanilhaAmeixa(
      [
        lanc({}),
        lanc({
          id: "lanc-2",
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
    expect(linhas.map((l) => l["codigo"])).toEqual(["lanc-1", "lanc-2"]);

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
      problema: null,
    });
  });

  it("as abas Categorias e Contas levam os códigos", () => {
    const lida = lerPlanilhaDoAmeixa(gerarPlanilhaAmeixa([lanc({})], listas))!;
    expect(lida.categorias).toEqual([
      { linha: 2, codigo: "cat-moradia", tipo: "Despesa", categoria: "Moradia", subcategoria: "" },
      { linha: 3, codigo: "sub-luz", tipo: "Despesa", categoria: "Moradia", subcategoria: "Luz" },
      { linha: 4, codigo: "sub-agua", tipo: "Despesa", categoria: "Moradia", subcategoria: "Água" },
    ]);
    expect(lida.contas).toEqual([{ linha: 2, codigo: "conta-pag", nome: "PAG BANK" }]);
    expect(lida.lancamentos[0]).toMatchObject({ linha: 2, codigo: "lanc-1" });
  });

  it("planilha sem coluna Código não é tratada como do Ameixa", () => {
    const aba = XLSX.utils.aoa_to_sheet([
      ["Data", "Descrição", "Valor"],
      ["01/09/2026", "Mercado", "10,00"],
    ]);
    const pasta = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(pasta, aba, "Lançamentos");
    const buf = XLSX.write(pasta, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    expect(lerPlanilhaDoAmeixa(buf)).toBeNull();
  });

  it("aporte em meta não vai para a planilha", () => {
    expect(lerExcel(gerarPlanilhaAmeixa([lanc({ tipo: "aporte" })], listas))).toEqual([]);
  });
});
