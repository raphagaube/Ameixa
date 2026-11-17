import { hexParaRgb } from "@/lib/theme";

export type ModoCorCategoria = "auto" | "branco" | "preto";

/** Preto ou branco: escolhe o maior contraste sobre a cor da categoria. */
export function tintaCategoria(fundo: string): string {
  const { r, g, b } = hexParaRgb(fundo);
  const linear = (canal: number) => {
    const valor = canal / 255;
    return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  };
  const luz = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return (luz + 0.05) / 0.05 >= 1.05 / (luz + 0.05) ? "#000000" : "#ffffff";
}

export function corTextoCategoria(fundo: string, modo: ModoCorCategoria): string {
  return modo === "auto" ? tintaCategoria(fundo) : modo === "branco" ? "#ffffff" : "#000000";
}
