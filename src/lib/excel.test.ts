import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { lerExcel, mapearDoExcel } from "./excel";

/** Monta um .xlsx de verdade em memória, para o teste exercitar o caminho real. */
function planilha(linhas: unknown[][]): ArrayBuffer {
  const aba = XLSX.utils.aoa_to_sheet(linhas);
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, aba, "Planilha1");
  const buf = XLSX.write(pasta, { type: "array", bookType: "xlsx" });
  return buf as ArrayBuffer;
}

describe("leitura do Excel", () => {
  it("usa a primeira linha como cabeçalho", () => {
    const r = lerExcel(
      planilha([
        ["Data", "Descrição", "Valor"],
        ["01/09/2026", "Mercado", "218,40"],
      ]),
    );
    expect(r).toHaveLength(1);
    expect(r[0]["descricao"]).toBe("Mercado");
  });

  it("tira acento do cabeçalho", () => {
    const r = lerExcel(
      planilha([
        ["Descrição", "Valor"],
        ["Padaria", 10],
      ]),
    );
    expect(r[0]["descricao"]).toBe("Padaria");
  });

  /**
   * O Excel guarda data como número de dias desde 1900. Sem converter, a
   * célula viraria "45901" e a linha inteira seria descartada.
   */
  it("converte data de verdade do Excel, não o número de série", () => {
    const r = lerExcel(
      planilha([
        ["Data", "Descrição", "Valor"],
        [new Date(2026, 8, 1), "Mercado", 218.4],
      ]),
    );
    expect(r[0]["data"]).toBe("2026-09-01");
  });

  it("planilha só com cabeçalho devolve lista vazia", () => {
    expect(lerExcel(planilha([["Data", "Valor"]]))).toEqual([]);
  });

  it("planilha vazia não quebra", () => {
    expect(lerExcel(planilha([]))).toEqual([]);
  });
});

describe("mapeamento do Excel para lançamento", () => {
  it("lê a planilha com data de verdade e número de verdade", () => {
    const linhas = lerExcel(
      planilha([
        ["Data", "Descrição", "Tipo", "Valor"],
        [new Date(2026, 8, 1), "Mercado", "despesa", 218.4],
      ]),
    );
    expect(mapearDoExcel(linhas)).toEqual([
      {
        tipo: "despesa",
        valor: 218.4,
        descricao: "Mercado",
        data_registro: "2026-09-01",
        situacao: "pago",
        responsavel: null,
        observacao: null,
      },
    ]);
  });

  it("sem coluna de tipo, o sinal do valor decide", () => {
    const linhas = lerExcel(
      planilha([
        ["Data", "Descrição", "Valor"],
        [new Date(2026, 8, 1), "Salário", 5200],
        [new Date(2026, 8, 2), "Mercado", -50],
      ]),
    );
    const r = mapearDoExcel(linhas);
    expect(r[0].tipo).toBe("receita");
    expect(r[1].tipo).toBe("despesa");
    expect(r[1].valor).toBe(50);
  });

  it("descarta linha incompleta em vez de importar lixo", () => {
    const linhas = lerExcel(
      planilha([
        ["Data", "Descrição", "Valor"],
        [new Date(2026, 8, 1), "", 10],
        ["", "Mercado", 10],
        [new Date(2026, 8, 1), "Mercado", 0],
        [new Date(2026, 8, 1), "Padaria", 32],
      ]),
    );
    const r = mapearDoExcel(linhas);
    expect(r).toHaveLength(1);
    expect(r[0].descricao).toBe("Padaria");
  });

  it("aceita data escrita como texto na planilha", () => {
    const linhas = lerExcel(
      planilha([
        ["Data", "Descrição", "Valor"],
        ["01/09/2026", "Mercado", "1.234,56"],
      ]),
    );
    const r = mapearDoExcel(linhas);
    expect(r[0].data_registro).toBe("2026-09-01");
    expect(r[0].valor).toBe(1234.56);
  });
});

describe("qual aba é lida", () => {
  /**
   * Planilha de controle costuma ter resumo ou instruções na frente. Antes
   * o app lia cegamente a primeira e dizia que não havia linhas — falso
   * para quem estava olhando as mil linhas na aba de trás.
   */
  it("pula abas sem dados e lê a primeira que tem", () => {
    const pasta = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      pasta,
      XLSX.utils.aoa_to_sheet([["Controle financeiro 2026"]]),
      "Instruções",
    );
    XLSX.utils.book_append_sheet(
      pasta,
      XLSX.utils.aoa_to_sheet([
        ["Data", "Descrição", "Valor"],
        ["01/07/2026", "Mercado", "83,63"],
      ]),
      "Lançamentos",
    );

    const linhas = lerExcel(
      XLSX.write(pasta, { type: "array", bookType: "xlsx" }) as ArrayBuffer,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].descricao).toBe("Mercado");
  });
});
