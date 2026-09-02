/**
 * Posição do botão flutuante, escolhida pelo usuário arrastando com o dedo.
 *
 * Guardada como lado (esquerda/direita) e distância do rodapé. Guardar o
 * lado em vez da coordenada X faz o botão continuar encostado na borda
 * quando a tela muda de tamanho — girar o celular não deixa ele no meio.
 */

export type Lado = "esquerda" | "direita";
export type Posicao = { lado: Lado; deBaixo: number };

export const CHAVE_POSICAO = "ameixa:posicao-flutuante";

/** Espaço mínimo do rodapé: a barra de abas mais uma folga. */
export const MIN_DE_BAIXO = 72;

export const PADRAO: Posicao = { lado: "direita", deBaixo: MIN_DE_BAIXO };

/** Prende a posição dentro da tela, para o botão nunca sumir na borda. */
export function prender(
  deBaixo: number,
  alturaDaTela: number,
  alturaDoBotao: number,
): number {
  const teto = Math.max(alturaDaTela - alturaDoBotao - 16, MIN_DE_BAIXO);
  return Math.min(Math.max(deBaixo, MIN_DE_BAIXO), teto);
}

/** Depois de arrastar, o botão encosta na borda mais próxima. */
export function ladoMaisProximo(x: number, larguraDaTela: number): Lado {
  return x < larguraDaTela / 2 ? "esquerda" : "direita";
}

/**
 * Distingue um toque de um arrasto. Abaixo do limite é toque e o botão
 * abre o Registro Fácil; acima, o usuário estava movendo e o toque não
 * deve disparar nada.
 */
export const LIMITE_ARRASTO = 8;

export function foiArrasto(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > LIMITE_ARRASTO;
}

export function ler(bruto: string | null): Posicao {
  if (!bruto) return PADRAO;
  try {
    const p = JSON.parse(bruto) as Partial<Posicao>;
    const lado: Lado = p.lado === "esquerda" ? "esquerda" : "direita";
    const deBaixo =
      typeof p.deBaixo === "number" && Number.isFinite(p.deBaixo)
        ? Math.max(p.deBaixo, MIN_DE_BAIXO)
        : PADRAO.deBaixo;
    return { lado, deBaixo };
  } catch {
    return PADRAO;
  }
}
