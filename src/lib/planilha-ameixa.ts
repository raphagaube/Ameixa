import * as XLSX from "xlsx";
import type { ListasPlanilha } from "@/lib/listas-planilha";
import type { LancamentoNaLista, Situacao } from "@/lib/tipos/lancamentos";

/**
 * A planilha do próprio Ameixa: o modelo em branco para preencher e a
 * exportação dos lançamentos, no mesmo formato — que o importador lê sem
 * precisar acertar coluna nenhuma.
 *
 * Três abas, nesta ordem: "Lançamentos", a que se preenche e a que o
 * importador procura pelo nome; "Instruções"; e "Listas", com os nomes de
 * categorias, contas e formas que o importador reconhece.
 */

export const ABA_LANCAMENTOS = "Lançamentos";

/** Cabeçalhos, na ordem. Cada um casa sozinho com um campo do importador. */
export const COLUNAS_PLANILHA = [
  "Data",
  "Vencimento",
  "Descrição",
  "Valor",
  "Tipo",
  "Situação",
  "Categoria",
  "Subcategoria",
  "Conta",
  "Forma de pagamento",
  "Responsável",
  "Observação",
] as const;

const LARGURAS = [12, 12, 38, 13, 10, 12, 22, 22, 20, 20, 16, 32];
const COLUNA_VALOR = 3;

/**
 * Como a situação vai escrita. "Pago", e não "Já pago" como a tela mostra:
 * a planilha é para ser lida de volta, e o texto curto é o que se digita.
 */
const SITUACAO_NA_PLANILHA: Record<Situacao, string> = {
  pago: "Pago",
  a_pagar: "A pagar",
  recebido: "Recebido",
  a_receber: "A receber",
  guardado: "Guardado",
};

/** Data do banco (aaaa-mm-dd) como data de verdade do Excel, sem fuso no meio. */
function comoData(iso: string | null): Date | null {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function linhaDaPlanilha(l: LancamentoNaLista): (string | number | Date | null)[] {
  return [
    comoData(l.data_registro),
    comoData(l.data_vencimento),
    l.descricao,
    l.valor,
    l.tipo === "receita" ? "Receita" : "Despesa",
    SITUACAO_NA_PLANILHA[l.situacao],
    l.categoria?.nome ?? "",
    l.subcategoria?.nome ?? "",
    l.conta?.nome ?? "",
    l.forma_pagamento ?? "",
    l.responsavel ?? "",
    l.observacao ?? "",
  ];
}

function abaLancamentos(lancamentos: LancamentoNaLista[]): XLSX.WorkSheet {
  // Aporte em meta não é despesa nem receita — a regra inviolável — e o
  // importador não saberia o que fazer com ele.
  const linhas = [
    [...COLUNAS_PLANILHA],
    ...lancamentos.filter((l) => l.tipo !== "aporte").map(linhaDaPlanilha),
  ];

  const aba = XLSX.utils.aoa_to_sheet(linhas, { cellDates: true, dateNF: "dd/mm/yyyy" });

  // Valor como número de verdade, com o formato de moeda do Excel: dá para
  // somar e filtrar na planilha, e o importador lê igual.
  for (let r = 1; r < linhas.length; r++) {
    const celula = aba[XLSX.utils.encode_cell({ r, c: COLUNA_VALOR })];
    if (celula) celula.z = "#,##0.00";
  }

  aba["!cols"] = LARGURAS.map((wch) => ({ wch }));
  aba["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(linhas.length - 1, 0), c: COLUNAS_PLANILHA.length - 1 },
    }),
  };
  return aba;
}

function abaInstrucoes(): XLSX.WorkSheet {
  const aba = XLSX.utils.aoa_to_sheet([
    ["Como preencher a planilha do Ameixa"],
    [],
    ["Coluna", "Obrigatória", "Como escrever", "Exemplo"],
    ["Data", "Sim", "Dia do lançamento, em dd/mm/aaaa.", "10/09/2026"],
    ["Vencimento", "Não", "Quando vence. Em branco se não tiver vencimento.", "15/09/2026"],
    ["Descrição", "Sim", "O que foi.", "Conta de luz"],
    ["Valor", "Sim", "Sempre positivo. É o Tipo que diz se o dinheiro entra ou sai.", "1.234,56"],
    ["Tipo", "Não", "Despesa ou Receita. Em branco vira Despesa.", "Despesa"],
    [
      "Situação",
      "Não",
      "Pago, A pagar, Recebido ou A receber. Em branco vira Pago (ou Recebido, na receita).",
      "A pagar",
    ],
    ["Categoria", "Não", "Nome de uma categoria do app — veja a aba Listas.", "Moradia"],
    ["Subcategoria", "Não", "Nome de uma subcategoria da categoria escolhida.", "Luz"],
    [
      "Conta",
      "Não",
      "Nome de uma conta do app. Em branco, vale a conta escolhida na hora de importar.",
      "PAG BANK",
    ],
    ["Forma de pagamento", "Não", "Pix, Débito, Crédito, Boleto…", "Pix"],
    ["Responsável", "Não", "Quem fez o lançamento.", ""],
    ["Observação", "Não", "Texto livre.", ""],
    [],
    ["Importante"],
    ["• Preencha a aba Lançamentos, uma linha por lançamento, sem mudar os títulos da primeira linha."],
    [
      "• Importar esta planilha cria lançamentos novos. Ela não altera os que já existem no app — para isso, use as telas de edição.",
    ],
    [
      "• Se a planilha tiver linhas que já estão no app, o Ameixa avisa antes de gravar e pergunta se deve pular ou importar de novo.",
    ],
    ["• Categoria, subcategoria e conta com nome diferente do app ficam em branco, e o lançamento vai para Pendências."],
    ["• Aportes em metas não entram na planilha: eles não são despesa nem receita."],
  ]);
  aba["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 72 }, { wch: 16 }];
  return aba;
}

function abaListas(listas: ListasPlanilha): XLSX.WorkSheet {
  const linhas: string[][] = [["Tipo", "Categoria", "Subcategorias"]];
  for (const c of listas.categorias) {
    linhas.push([c.tipo === "receita" ? "Receita" : "Despesa", c.nome, c.subcategorias.join(", ")]);
  }
  linhas.push([], ["Contas"], ...listas.contas.map((n) => [n]));
  linhas.push([], ["Formas de pagamento"], ...listas.formas.map((n) => [n]));
  linhas.push([], ["Situações"], ["Pago"], ["A pagar"], ["Recebido"], ["A receber"]);

  const aba = XLSX.utils.aoa_to_sheet(linhas);
  aba["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 70 }];
  return aba;
}

/**
 * Monta o arquivo .xlsx. Sem lançamentos, é o modelo em branco — só o
 * cabeçalho na aba Lançamentos, com as outras duas abas de apoio.
 */
export function gerarPlanilhaAmeixa(
  lancamentos: LancamentoNaLista[],
  listas: ListasPlanilha,
): ArrayBuffer {
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, abaLancamentos(lancamentos), ABA_LANCAMENTOS);
  XLSX.utils.book_append_sheet(pasta, abaInstrucoes(), "Instruções");
  XLSX.utils.book_append_sheet(pasta, abaListas(listas), "Listas");
  return XLSX.write(pasta, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
