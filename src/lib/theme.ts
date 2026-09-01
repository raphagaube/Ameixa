/**
 * Derivação da família de cores a partir de um único hex de acento.
 * Regras em design_handoff_ameixa/README.md › "Acento e cor derivada".
 *
 * Regra crítica: elementos coloridos (abas ativas, barras, botões) usam --deep,
 * nunca --ac puro. Com um acento quase preto no tema escuro, --ac some no fundo.
 */

export type Modo = "light" | "dark";

export const ACENTOS = {
  rosa: "#E7A8C4",
  azul: "#93B4D8",
  verde: "#93C9A8",
} as const;

export const ACENTO_PADRAO = ACENTOS.verde;

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

export function hexParaRgb(hex: string): Rgb {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  // parseInt não serve de validação: parseInt("banana", 16) lê o "ba" e
  // devolve 186 em vez de NaN. A checagem tem que ser do texto inteiro.
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    return hexParaRgb(ACENTO_PADRAO);
  }
  const n = Number.parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Luminância percebida, 0 a 1. É o que decide se a tinta sobre o acento é clara ou escura. */
export function luminancia({ r, g, b }: Rgb): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function rgbParaHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: h * 360, s: s * 100, l: l * 100 };
}

const arred = (n: number) => Math.round(n * 10) / 10;

/** Tinta que fica legível POR CIMA do acento. */
export function tintaSobreAcento(hex: string): string {
  return luminancia(hexParaRgb(hex)) > 0.6 ? "#14161a" : "#ffffff";
}

export type Tokens = {
  ac: string;
  onAc: string;
  deep: string;
  tint: string;
  chart2: string;
};

export function derivarTokens(hex: string, modo: Modo): Tokens {
  const { h, s: sBruta, l } = rgbParaHsl(hexParaRgb(hex));
  // Acentos quase cinzas ficariam invisíveis; o handoff fixa um piso de saturação.
  const s = Math.max(sBruta, 22);
  const escuro = modo === "dark";

  const deep = escuro
    ? `hsl(${arred(h)} ${arred(Math.min(s + 8, 92))}% ${arred(Math.max(l, 74))}%)`
    : `hsl(${arred(h)} ${arred(Math.min(s + 14, 88))}% ${arred(Math.min(l, 34))}%)`;

  const tint = escuro
    ? `hsl(${arred(h)} ${arred(s)}% ${arred(Math.max(l, 55))}% / .16)`
    : `hsl(${arred(h)} ${arred(Math.min(s + 6, 80))}% ${arred(Math.max(l, 94))}%)`;

  const chart2 = `hsl(${arred((h + 38) % 360)} ${arred(Math.min(s + 6, 78))}% ${escuro ? 68 : 44}%)`;

  return { ac: hex, onAc: tintaSobreAcento(hex), deep, tint, chart2 };
}

/** Bloco de CSS variables pronto para injetar no elemento raiz. */
export function tokensComoCss(hex: string, modo: Modo): string {
  const t = derivarTokens(hex, modo);
  return [
    `--ac:${t.ac}`,
    `--on-ac:${t.onAc}`,
    `--deep:${t.deep}`,
    `--tint:${t.tint}`,
    `--chart2:${t.chart2}`,
  ].join(";");
}
