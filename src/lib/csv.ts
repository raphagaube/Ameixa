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

/**
 * Data em dd/mm/aaaa ou aaaa-mm-dd.
 *
 * A hora que vier depois é ignorada: planilha de banco e de controle
 * financeiro costuma gravar "01/07/2025 12:00:00", e exigir a data
 * terminando ali descartava a linha inteira.
 */
export function lerData(texto: string): string | null {
  const t = texto.trim();

  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?=$|[\s,T])/);
  if (br) {
    const [, d, m, a] = br;
    const dn = Number(d);
    const mn = Number(m);
    if (dn < 1 || dn > 31 || mn < 1 || mn > 12) return null;
    return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})(?=$|[\s,T])/);
  if (iso) {
    const mn = Number(iso[2]);
    const dn = Number(iso[3]);
    if (dn < 1 || dn > 31 || mn < 1 || mn > 12) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

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
/** Por que uma linha foi descartada — vira mensagem de erro útil. */
export type Diagnostico = {
  total: number;
  semData: number;
  semValor: number;
  semDescricao: number;
};

/** Traduz a coluna Status da planilha para a situação do lançamento. */
function lerSituacao(
  bruto: string,
  tipo: "receita" | "despesa",
): "pago" | "a_pagar" | "recebido" | "a_receber" {
  const s = bruto.trim().toLowerCase();
  if (tipo === "receita") {
    return s.startsWith("receb") ? "recebido" : s ? "a_receber" : "recebido";
  }
  return s.startsWith("pag") ? "pago" : s ? "a_pagar" : "pago";
}

export function mapearLancamentos(linhas: LinhaCru[]) {
  const saida = [];

  for (const l of linhas) {
    const data = lerData(l["data"] ?? l["data registro"] ?? "");
    const valor = lerNumero(l["valor"] ?? "");
    const descricao = (l["descricao"] ?? l["descrição"] ?? "").trim();
    if (!data || valor === null || valor === 0 || !descricao) continue;

    const tipoTexto = (l["tipo"] ?? "").toLowerCase();
    const tipo: "receita" | "despesa" =
      tipoTexto.includes("receita") || (!tipoTexto && valor > 0)
        ? "receita"
        : "despesa";

    saida.push({
      tipo,
      valor: Math.abs(valor),
      descricao,
      data_registro: data,
      situacao: lerSituacao(l["status"] ?? "", tipo),
      responsavel: (l["responsavel"] ?? "").trim() || null,
      // A categoria da planilha vira observação: o nome dela não bate com o
      // das categorias do app, e o vínculo é por código interno.
      observacao:
        [l["observacao"], l["categoria"]]
          .map((x) => (x ?? "").trim())
          .filter(Boolean)
          .join(" · ")
          .slice(0, 2000) || null,
    });
  }

  return saida;
}

/** Conta por que as linhas caíram, para o erro não ser só "não achei nada". */
export function diagnosticar(linhas: LinhaCru[]): Diagnostico {
  const d: Diagnostico = {
    total: linhas.length,
    semData: 0,
    semValor: 0,
    semDescricao: 0,
  };

  for (const l of linhas) {
    if (!lerData(l["data"] ?? l["data registro"] ?? "")) d.semData++;
    const v = lerNumero(l["valor"] ?? "");
    if (v === null || v === 0) d.semValor++;
    if (!(l["descricao"] ?? l["descrição"] ?? "").trim()) d.semDescricao++;
  }

  return d;
}

/** Mensagem em português explicando o que impediu a importação. */
export function explicarFalha(d: Diagnostico, colunas: string[]): string {
  if (d.total === 0) {
    return "O arquivo não tem linhas além do cabeçalho.";
  }

  const achadas = `Colunas encontradas: ${colunas.join(", ")}.`;

  if (d.semData === d.total) {
    return `Li ${d.total} linhas, mas nenhuma tinha data reconhecível. Aceito 01/07/2025 ou 2025-07-01. ${achadas}`;
  }
  if (d.semValor === d.total) {
    return `Li ${d.total} linhas, mas nenhuma tinha valor. ${achadas}`;
  }
  if (d.semDescricao === d.total) {
    return `Li ${d.total} linhas, mas todas estão sem descrição. ${achadas}`;
  }

  return `Li ${d.total} linhas, mas nenhuma tinha data, valor e descrição ao mesmo tempo. ${achadas}`;
}
