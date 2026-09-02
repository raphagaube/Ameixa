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
