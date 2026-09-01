import { lerData, lerNumero, type LinhaCru } from "@/lib/csv";

/**
 * Motor do assistente de importação.
 *
 * A ideia é não deixar o usuário errar: em vez de aceitar o arquivo e falhar
 * calado, o app mostra quais colunas achou, o que entendeu de cada uma e uma
 * prévia das primeiras linhas — antes de gravar qualquer coisa.
 */

export type CampoAlvo =
  | "data"
  | "descricao"
  | "valor"
  | "tipo"
  | "status"
  | "categoria"
  | "responsavel"
  | "observacao";

export const CAMPOS: { campo: CampoAlvo; rotulo: string; obrigatorio: boolean }[] = [
  { campo: "data", rotulo: "Data", obrigatorio: true },
  { campo: "descricao", rotulo: "Descrição", obrigatorio: true },
  { campo: "valor", rotulo: "Valor", obrigatorio: true },
  { campo: "tipo", rotulo: "Tipo (despesa/receita)", obrigatorio: false },
  { campo: "status", rotulo: "Situação (pago/recebido)", obrigatorio: false },
  { campo: "categoria", rotulo: "Categoria", obrigatorio: false },
  { campo: "responsavel", rotulo: "Responsável", obrigatorio: false },
  { campo: "observacao", rotulo: "Observação", obrigatorio: false },
];

export type Mapeamento = Partial<Record<CampoAlvo, string>>;

/** Nomes de coluna que costumam aparecer, por campo. */
const APELIDOS: Record<CampoAlvo, string[]> = {
  data: ["data", "data registro", "data lancamento", "dia", "date", "data compra"],
  descricao: ["descricao", "historico", "estabelecimento", "titulo", "lancamento", "memo", "nome"],
  valor: ["valor", "quantia", "montante", "amount", "vlr", "total"],
  tipo: ["tipo", "natureza", "operacao", "d/c"],
  status: ["status", "situacao", "pago"],
  categoria: ["categoria", "classificacao", "grupo"],
  responsavel: ["responsavel", "pessoa", "quem", "titular"],
  observacao: ["observacao", "obs", "nota", "comentario", "detalhe"],
};

/**
 * Palpite de qual coluna serve para cada campo.
 *
 * Casa primeiro por nome exato e só depois por "começa com" — senão a coluna
 * "Data Baixa" roubaria o lugar de "Data".
 */
export function palpitarMapeamento(colunas: string[]): Mapeamento {
  const mapa: Mapeamento = {};
  const usadas = new Set<string>();

  const tentar = (campo: CampoAlvo, casa: (c: string, a: string) => boolean) => {
    if (mapa[campo]) return;
    for (const apelido of APELIDOS[campo]) {
      const achada = colunas.find((c) => !usadas.has(c) && casa(c, apelido));
      if (achada) {
        mapa[campo] = achada;
        usadas.add(achada);
        return;
      }
    }
  };

  for (const { campo } of CAMPOS) tentar(campo, (c, a) => c === a);
  for (const { campo } of CAMPOS) tentar(campo, (c, a) => c.startsWith(a));
  for (const { campo } of CAMPOS) tentar(campo, (c, a) => c.includes(a));

  return mapa;
}

export type LinhaPrevia = {
  numero: number;
  data: string | null;
  descricao: string;
  valor: number | null;
  tipo: "despesa" | "receita";
  situacao: "pago" | "a_pagar" | "recebido" | "a_receber";
  categoriaTexto: string;
  responsavel: string | null;
  observacao: string | null;
  problema: string | null;
};

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

/** Aplica o mapeamento e diz, linha a linha, o que está faltando. */
export function analisarLinhas(
  linhas: LinhaCru[],
  mapa: Mapeamento,
): LinhaPrevia[] {
  const pegar = (l: LinhaCru, campo: CampoAlvo) => {
    const coluna = mapa[campo];
    return coluna ? (l[coluna] ?? "") : "";
  };

  return linhas.map((l, i) => {
    const data = lerData(pegar(l, "data"));
    const valor = lerNumero(pegar(l, "valor"));
    const descricao = pegar(l, "descricao").trim();

    const tipoTexto = pegar(l, "tipo").toLowerCase();
    const tipo: "despesa" | "receita" =
      tipoTexto.includes("receita") ||
      tipoTexto.includes("credito") ||
      tipoTexto.includes("crédito") ||
      (!tipoTexto && (valor ?? 0) > 0 && !mapa.tipo)
        ? "receita"
        : "despesa";

    const faltas: string[] = [];
    if (!data) faltas.push("data");
    if (valor === null || valor === 0) faltas.push("valor");
    if (!descricao) faltas.push("descrição");

    return {
      numero: i + 2, // +2: a linha 1 é o cabeçalho e a contagem começa em 1
      data,
      descricao,
      valor,
      tipo,
      situacao: lerSituacao(pegar(l, "status"), tipo),
      categoriaTexto: pegar(l, "categoria").trim(),
      responsavel: pegar(l, "responsavel").trim() || null,
      observacao: pegar(l, "observacao").trim() || null,
      problema: faltas.length > 0 ? `sem ${faltas.join(", ")}` : null,
    };
  });
}

export type Resumo = {
  total: number;
  validas: number;
  comProblema: number;
  receitas: number;
  despesas: number;
  somaReceitas: number;
  somaDespesas: number;
  primeiraData: string | null;
  ultimaData: string | null;
};

export function resumir(previas: LinhaPrevia[]): Resumo {
  const validas = previas.filter((p) => !p.problema);
  const datas = validas.map((p) => p.data!).sort();

  return {
    total: previas.length,
    validas: validas.length,
    comProblema: previas.length - validas.length,
    receitas: validas.filter((p) => p.tipo === "receita").length,
    despesas: validas.filter((p) => p.tipo === "despesa").length,
    somaReceitas: validas
      .filter((p) => p.tipo === "receita")
      .reduce((s, p) => s + Math.abs(p.valor!), 0),
    somaDespesas: validas
      .filter((p) => p.tipo === "despesa")
      .reduce((s, p) => s + Math.abs(p.valor!), 0),
    primeiraData: datas[0] ?? null,
    ultimaData: datas[datas.length - 1] ?? null,
  };
}

/**
 * Casa o nome da categoria da planilha com as categorias do app.
 *
 * A planilha costuma trazer o nome com a explicação junto —
 * "ALIMENTAÇÃO (supermercado, padaria...)". Comparar o texto inteiro nunca
 * casaria; então compara só a primeira parte, sem acento e sem o parêntese.
 */
export function normalizarNomeCategoria(bruto: string): string {
  return bruto
    .split("(")[0]
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function casarCategoria(
  textoDaPlanilha: string,
  categorias: { id: string; nome: string; tipo: "despesa" | "receita" }[],
  tipo: "despesa" | "receita",
): string | null {
  const alvo = normalizarNomeCategoria(textoDaPlanilha);
  if (!alvo) return null;

  const doTipo = categorias.filter((c) => c.tipo === tipo);

  const exata = doTipo.find((c) => normalizarNomeCategoria(c.nome) === alvo);
  if (exata) return exata.id;

  // "REFEIÇÕES FORA" contra "Alimentação" não casa, e tudo bem: o lançamento
  // fica em pendências com o nome original guardado na observação.
  const parcial = doTipo.find((c) => {
    const n = normalizarNomeCategoria(c.nome);
    return n.length >= 4 && (alvo.startsWith(n) || n.startsWith(alvo));
  });

  return parcial?.id ?? null;
}
