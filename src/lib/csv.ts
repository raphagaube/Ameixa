/**
 * Leitura de CSV para a importação.
 *
 * Aceita ponto e vírgula (o padrão do Excel em português) ou vírgula, e
 * lida com campos entre aspas que contenham o separador dentro.
 */

export function detectarSeparador(primeiraLinha: string): ";" | "," {
  const pv = (primeiraLinha.match(/;/g) ?? []).length;
  const v = (primeiraLinha.match(/,/g) ?? []).length;
  return pv >= v ? ";" : ",";
}

export function lerLinhaCsv(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];

    if (c === '"') {
      // Duas aspas seguidas dentro do campo significam uma aspa literal.
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
      continue;
    }

    if (c === sep && !dentroDeAspas) {
      campos.push(atual.trim());
      atual = "";
      continue;
    }

    atual += c;
  }

  campos.push(atual.trim());
  return campos;
}

/** Número em formato brasileiro ou americano. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,-]/g, "").trim();
  if (!limpo) return null;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Data em dd/mm/aaaa ou aaaa-mm-dd. */
export function lerData(texto: string): string | null {
  const t = texto.trim();

  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, a] = br;
    return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  return null;
}

export type LinhaCru = Record<string, string>;

/** Converte o CSV inteiro em objetos, usando a primeira linha como cabeçalho. */
export function lerCsv(texto: string): LinhaCru[] {
  const linhas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");

  if (linhas.length < 2) return [];

  const sep = detectarSeparador(linhas[0]);
  const cabecalho = lerLinhaCsv(linhas[0], sep).map((c) =>
    c
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, ""),
  );

  return linhas.slice(1).map((l) => {
    const campos = lerLinhaCsv(l, sep);
    const obj: LinhaCru = {};
    cabecalho.forEach((c, i) => {
      obj[c] = campos[i] ?? "";
    });
    return obj;
  });
}

/**
 * Converte as linhas cruas no formato que a importação espera.
 * Reconhece os cabeçalhos que a nossa própria exportação gera.
 */
export function mapearLancamentos(linhas: LinhaCru[]) {
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
