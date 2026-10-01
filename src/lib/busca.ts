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
 * Monta o filtro "ou" do PostgREST.
 *
 * A vírgula separa condições nessa sintaxe, e valores em português vêm
 * cheios delas ("1.234,56"). Por isso o trecho da descrição vai entre
 * aspas, e as aspas de dentro são removidas.
 */
export function filtroOu(b: Busca): string | null {
  if (b.valor === null || b.texto === null) return null;
  const limpo = b.texto.replace(/["\\]/g, "");
  return `descricao.ilike."*${limpo}*",valor.eq.${b.valor}`;
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
