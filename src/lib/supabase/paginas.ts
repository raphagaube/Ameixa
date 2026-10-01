/**
 * Leitura completa de uma consulta, página a página.
 *
 * O Supabase devolve no máximo 1000 linhas por consulta e não avisa que
 * cortou — nem quando o código pede `.limit(5000)`. Com mais de mil
 * lançamentos, tudo que lia "todos" de uma vez passou a somar só os mil
 * primeiros: o saldo do Início, o backup, o documento do extrato.
 */

/** O teto do servidor por consulta. */
export const PAGINA = 1000;

type Resposta<T> = { data: T[] | null; error: unknown };

/**
 * Lê a consulta inteira (ou até `teto` linhas).
 *
 * `consulta(de, ate)` monta a consulta do zero e termina em `.range(de, ate)`.
 * Ela precisa de uma ordem estável — termine os `.order(...)` com a chave
 * primária —, senão o banco pode repetir ou pular linhas entre uma página e
 * outra.
 *
 * Devolve `null` se alguma página falhar: metade de uma lista parece uma
 * lista inteira, e quem chama precisa saber que não é.
 */
export async function lerTudo<T>(
  consulta: (de: number, ate: number) => PromiseLike<Resposta<T>>,
  teto = Infinity,
): Promise<T[] | null> {
  const linhas: T[] = [];
  while (linhas.length < teto) {
    const de = linhas.length;
    const pedidas = Math.min(PAGINA, teto - de);
    const { data, error } = await consulta(de, de + pedidas - 1);
    if (error || !data) return null;
    for (const linha of data) linhas.push(linha);
    if (data.length < pedidas) break;
  }
  return linhas;
}
