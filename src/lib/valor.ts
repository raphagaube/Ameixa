/**
 * Leitura e escrita do campo de dinheiro.
 *
 * Armadilha nº 3 do handoff: o campo guarda TEXTO CRU e só normaliza no
 * salvar. Converter para número a cada tecla trava o apagar — o usuário
 * apaga a vírgula e o valor se reescreve sozinho.
 */

/**
 * Converte o texto cru do campo em número. Aceita "1.234,56", "1234,56",
 * "1234.56" e vazio. Devolve null quando não dá para entender.
 */
export function lerValor(texto: string): number | null {
  const limpo = texto.trim();
  if (limpo === "") return 0;

  // Se tem vírgula, ela é o decimal e o ponto é separador de milhar.
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  const soNumero = normalizado.replace(/[^\d.-]/g, "");
  if (soNumero === "" || soNumero === "-" || soNumero === ".") return null;

  const n = Number(soNumero);
  return Number.isFinite(n) ? n : null;
}

/** Número para o texto que o campo mostra ao abrir em edição. */
export function escreverValor(n: number): string {
  if (!n) return "";
  return n.toFixed(2).replace(".", ",");
}
