import { lerValor } from "@/lib/valor";

/**
 * Interpretação do campo de busca do extrato.
 *
 * O mesmo campo serve para descrição e para valor: quem procura "363" quase
 * sempre quer a conta de R$ 363,00, não um estabelecimento chamado 363.
 */

export type Busca = {
  /** Trecho a procurar na descrição, ou null quando o texto é só um número. */
  texto: string | null;
  /** Valor exato a procurar, ou null quando o texto não parece um valor. */
  valor: number | null;
};

/** Só dígitos, separadores, espaço, sinal e o símbolo da moeda. */
const PARECE_VALOR = /^[\s$R]*-?[\d.,]+[\s]*$/i;

export function interpretarBusca(bruto: string): Busca {
  const texto = bruto.trim();
  if (!texto) return { texto: null, valor: null };

  if (!PARECE_VALOR.test(texto)) {
    return { texto, valor: null };
  }

  const n = lerValor(texto);
  if (n === null || n === 0) {
    return { texto, valor: null };
  }

  // Texto puramente numérico: procura pelo valor e também na descrição,
  // porque "3/10" de uma parcela mora na descrição.
  return { texto, valor: Math.abs(n) };
}

/**
 * Cada letra e as formas acentuadas dela. Quem digita "claudia" precisa
 * achar "Cláudia", e quem digita "açúcar" precisa achar "acucar".
 */
const VARIANTES: Record<string, string> = {
  a: "aáàâãäAÁÀÂÃÄ",
  e: "eéèêëEÉÈÊË",
  i: "iíìîïIÍÌÎÏ",
  o: "oóòôõöOÓÒÔÕÖ",
  u: "uúùûüUÚÙÛÜ",
  c: "cçCÇ",
  n: "nñNÑ",
};

/** O que uma expressão regular leria como comando; vira letra comum. */
const ESPECIAIS = new Set([".", "*", "+", "?", "(", ")", "[", "{", "}", "|", "$"]);

/**
 * O texto digitado como expressão regular que ignora acentos.
 *
 * `ilike` ignora maiúsculas, mas não acentos: "claudia" não achava "Cláudia"
 * nem "agua" achava "Água". O PostgREST aceita expressão regular sem
 * diferenciar maiúsculas (`imatch`), então cada letra vira o conjunto das
 * suas variantes: "agua" → "[aá…]g[uú…][aá…]".
 *
 * Caracteres de comando entram entre colchetes, para "(9/12)" procurar os
 * parênteses de verdade. Barra invertida, circunflexo, colchete de fechar e
 * aspas saem: não cabem num texto de busca e quebrariam o padrão ou a
 * sintaxe do PostgREST, que usa aspas e barra invertida para escapar.
 */
export function padraoSemAcento(texto: string): string {
  const base = texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\\^\]"]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let saida = "";
  for (const c of base) {
    if (VARIANTES[c]) saida += `[${VARIANTES[c]}]`;
    else if (ESPECIAIS.has(c)) saida += `[${c}]`;
    else saida += c;
  }
  return saida;
}

/**
 * Monta o filtro "ou" do PostgREST.
 *
 * A vírgula separa condições nessa sintaxe, e valores em português vêm
 * cheios delas ("1.234,56"). Por isso o padrão da descrição vai entre aspas.
 */
export function filtroOu(b: Busca): string | null {
  if (b.valor === null || b.texto === null) return null;
  const padrao = padraoSemAcento(b.texto);
  if (!padrao) return `valor.eq.${b.valor}`;
  return `descricao.imatch."${padrao}",valor.eq.${b.valor}`;
}

/**
 * O período contado pelo vencimento, na sintaxe "ou" do PostgREST.
 *
 * Vale o vencimento; quem não tem vencimento conta pela data do registro —
 * a mesma regra de `dataQueVale`. O extrato e os relatórios usam este mesmo
 * texto, para um não incluir o que o outro deixa de fora.
 */
export function filtroPeloVencimento(de?: string, ate?: string): string {
  const faixa = (coluna: string) =>
    [de ? `${coluna}.gte.${de}` : null, ate ? `${coluna}.lte.${ate}` : null]
      .filter(Boolean)
      .join(",");
  return `and(${faixa("data_vencimento")}),and(data_vencimento.is.null,${faixa("data_registro")})`;
}
