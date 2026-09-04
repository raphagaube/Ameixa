import * as XLSX from "xlsx";
import { mapearLancamentos, type LinhaCru } from "@/lib/csv";

/**
 * Leitura nativa de .xlsx / .xls.
 *
 * Roda no navegador: o arquivo nem chega ao servidor, só as linhas já
 * entendidas. Usa a build mantida do SheetJS (cdn.sheetjs.com) — a do npm
 * está parada na 0.18.5 com duas falhas altas sem correção.
 */

function normalizarCabecalho(c: string): string {
  return String(c)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * O Excel guarda data como número de dias desde 1900. Sem converter, uma
 * data viraria "45901" e a linha seria descartada.
 */
function celulaParaTexto(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    const a = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${a}-${m}-${d}`;
  }
  return String(v);
}

export function lerExcel(dados: ArrayBuffer): LinhaCru[] {
  // cellDates faz o SheetJS devolver Date em vez do número de série.
  const pasta = XLSX.read(dados, { type: "array", cellDates: true });

  // Procura a primeira aba com conteúdo, em vez de pegar a primeira e
  // pronto.
  //
  // Planilha de controle financeiro quase sempre tem uma aba de resumo ou
  // de instruções na frente, e os lançamentos atrás. Lendo cegamente a
  // primeira, o dono recebia "a planilha não tem linhas além do
  // cabeçalho" — falso do ponto de vista dele, que estava olhando para as
  // mil linhas na tela.
  let matriz: unknown[][] = [];
  for (const nome of pasta.SheetNames) {
    const candidata = XLSX.utils.sheet_to_json<unknown[]>(pasta.Sheets[nome], {
      header: 1,
      blankrows: false,
      defval: "",
    });
    if (candidata.length >= 2) {
      matriz = candidata;
      break;
    }
  }

  if (matriz.length < 2) return [];

  const cabecalho = (matriz[0] as unknown[]).map((c) =>
    normalizarCabecalho(celulaParaTexto(c)),
  );

  return matriz.slice(1).map((linha) => {
    const obj: LinhaCru = {};
    cabecalho.forEach((c, i) => {
      obj[c] = celulaParaTexto((linha as unknown[])[i]);
    });
    return obj;
  });
}

/**
 * Mesmas regras do CSV. Reusa a função em vez de repetir: quando a leitura
 * de data ganhou suporte a hora junto, os dois caminhos foram corrigidos de
 * uma vez só.
 */
export const mapearDoExcel = mapearLancamentos;
