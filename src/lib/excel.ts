import * as XLSX from "xlsx";
import { lerData, lerNumero, type LinhaCru } from "@/lib/csv";

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

  const primeiraAba = pasta.SheetNames[0];
  if (!primeiraAba) return [];

  const aba = pasta.Sheets[primeiraAba];
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(aba, {
    header: 1,
    blankrows: false,
    defval: "",
  });

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

/** Mesmas regras do CSV, para o resultado ser idêntico nos dois caminhos. */
export function mapearDoExcel(linhas: LinhaCru[]) {
  const saida = [];

  for (const l of linhas) {
    const data = lerData(l["data"] ?? l["data registro"] ?? "");
    const valor = lerNumero(l["valor"] ?? "");
    const descricao = (l["descricao"] ?? l["descrição"] ?? "").trim();
    if (!data || valor === null || valor === 0 || !descricao) continue;

    const tipoTexto = (l["tipo"] ?? "").toLowerCase();
    const tipo =
      tipoTexto.includes("receita") || (!tipoTexto && valor > 0)
        ? "receita"
        : "despesa";

    saida.push({
      tipo: tipo as "receita" | "despesa",
      valor: Math.abs(valor),
      descricao,
      data_registro: data,
      responsavel: (l["responsavel"] ?? "").trim() || null,
      observacao: (l["observacao"] ?? "").trim() || null,
    });
  }

  return saida;
}
