import * as XLSX from "xlsx";
import type { ListasPlanilha } from "@/lib/listas-planilha";
import type { LancamentoNaLista, Situacao } from "@/lib/tipos/lancamentos";

/**
 * A planilha do próprio Ameixa: o modelo em branco para preencher e a
 * exportação dos lançamentos, no mesmo formato.
 *
 * Abas, nesta ordem: "Lançamentos" (a que se preenche, e a que o importador
 * procura pelo nome), "Instruções", "Categorias", "Contas" e "Formas".
 *
 * A coluna "Código" é o que faz a planilha voltar para o app como
 * atualização: linha com código altera o lançamento que já existe, e nas
 * abas Categorias e Contas o código permite renomear. Sem código, a linha é
 * um lançamento novo.
 */

export const ABA_LANCAMENTOS = "Lançamentos";

/** Cabeçalhos, na ordem. O código fica por último, fora do caminho de quem preenche. */
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
  "Código",
] as const;

const LARGURAS = [12, 12, 38, 13, 10, 12, 22, 22, 20, 20, 16, 32, 38];
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
    l.id,
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
    ["Categoria", "Não", "Nome de uma categoria do app — veja a aba Categorias.", "Moradia"],
    ["Subcategoria", "Não", "Nome de uma subcategoria da categoria escolhida.", "Luz"],
    [
      "Conta",
      "Não",
      "Nome de uma conta do app — veja a aba Contas. Em branco, vale a conta escolhida ao importar.",
      "PAG BANK",
    ],
    ["Forma de pagamento", "Não", "Pix, Débito, Crédito, Boleto… — veja a aba Formas.", "Pix"],
    ["Responsável", "Não", "Quem fez o lançamento.", ""],
    ["Observação", "Não", "Texto livre.", ""],
    [
      "Código",
      "Não",
      "Preenchido pelo app. Não mude nem apague: é ele que liga a linha ao lançamento que já existe.",
      "",
    ],
    [],
    ["Atualizar o que já existe"],
    ["• Linha COM código atualiza o lançamento do app. Linha SEM código vira um lançamento novo."],
    [
      "• Para renomear uma categoria, subcategoria ou conta, mude o nome nas abas Categorias ou Contas e mantenha o código.",
    ],
    [
      "• Na aba Categorias, a linha com Subcategoria em branco é a própria categoria. Nas linhas de subcategoria, a coluna Categoria é só referência.",
    ],
    ["• Apagar uma linha da planilha não apaga nada no app."],
    ["• Antes de gravar, o app mostra tudo o que vai mudar e pede confirmação."],
    [
      "• Guarde o arquivo original sem editar: importá-lo de novo volta os lançamentos e os nomes para como estavam.",
    ],
    [],
    ["Importante"],
    ["• Preencha a aba Lançamentos, uma linha por lançamento, sem mudar os títulos da primeira linha."],
    ["• Categoria, subcategoria ou conta com nome que o app não reconhece é apontada antes de gravar."],
    ["• Aportes em metas não entram na planilha: eles não são despesa nem receita."],
  ]);
  aba["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 80 }, { wch: 16 }];
  return aba;
}

function abaCategorias(listas: ListasPlanilha): XLSX.WorkSheet {
  const linhas: string[][] = [["Tipo", "Categoria", "Subcategoria", "Código"]];
  for (const c of listas.categorias) {
    const tipo = c.tipo === "receita" ? "Receita" : "Despesa";
    linhas.push([tipo, c.nome, "", c.id]);
    for (const s of c.subcategorias) linhas.push([tipo, c.nome, s.nome, s.id]);
  }
  const aba = XLSX.utils.aoa_to_sheet(linhas);
  aba["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 38 }];
  return aba;
}

function abaContas(listas: ListasPlanilha): XLSX.WorkSheet {
  const aba = XLSX.utils.aoa_to_sheet([
    ["Conta", "Código"],
    ...listas.contas.map((c) => [c.nome, c.id]),
  ]);
  aba["!cols"] = [{ wch: 30 }, { wch: 38 }];
  return aba;
}

function abaFormas(listas: ListasPlanilha): XLSX.WorkSheet {
  const aba = XLSX.utils.aoa_to_sheet([
    ["Forma de pagamento"],
    ...listas.formas.map((f) => [f]),
    [],
    ["Situações"],
    ["Pago"],
    ["A pagar"],
    ["Recebido"],
    ["A receber"],
  ]);
  aba["!cols"] = [{ wch: 30 }];
  return aba;
}

/**
 * Monta o arquivo .xlsx. Sem lançamentos, é o modelo em branco — só o
 * cabeçalho na aba Lançamentos, com as abas de apoio.
 */
export function gerarPlanilhaAmeixa(
  lancamentos: LancamentoNaLista[],
  listas: ListasPlanilha,
): ArrayBuffer {
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, abaLancamentos(lancamentos), ABA_LANCAMENTOS);
  XLSX.utils.book_append_sheet(pasta, abaInstrucoes(), "Instruções");
  XLSX.utils.book_append_sheet(pasta, abaCategorias(listas), "Categorias");
  XLSX.utils.book_append_sheet(pasta, abaContas(listas), "Contas");
  XLSX.utils.book_append_sheet(pasta, abaFormas(listas), "Formas");
  return XLSX.write(pasta, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
