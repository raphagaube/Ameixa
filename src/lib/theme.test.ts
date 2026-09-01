import { describe, expect, it } from "vitest";
import {
  ACENTOS,
  derivarTokens,
  hexParaRgb,
  luminancia,
  rgbParaHsl,
  tintaSobreAcento,
} from "./theme";

/** Extrai os três números de uma string hsl(h s% l%) ou hsl(h s% l% / a). */
function partesHsl(css: string) {
  const nums = css.match(/[\d.]+/g);
  if (!nums) throw new Error(`não é hsl: ${css}`);
  return { h: Number(nums[0]), s: Number(nums[1]), l: Number(nums[2]) };
}

describe("conversão de cor", () => {
  it("lê hex de 6 dígitos", () => {
    expect(hexParaRgb("#93C9A8")).toEqual({ r: 147, g: 201, b: 168 });
  });

  it("expande hex de 3 dígitos", () => {
    expect(hexParaRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("cai no acento padrão quando o hex é inválido", () => {
    expect(hexParaRgb("banana")).toEqual(hexParaRgb(ACENTOS.verde));
  });

  it("calcula luminância pela fórmula do handoff", () => {
    expect(luminancia({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(luminancia({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it("converte para HSL", () => {
    const { h, s, l } = rgbParaHsl({ r: 255, g: 0, b: 0 });
    expect(h).toBeCloseTo(0, 1);
    expect(s).toBeCloseTo(100, 1);
    expect(l).toBeCloseTo(50, 1);
  });
});

describe("tinta sobre o acento", () => {
  it("usa tinta escura sobre acento claro", () => {
    expect(tintaSobreAcento("#ffffff")).toBe("#14161a");
  });

  it("usa tinta clara sobre acento escuro", () => {
    expect(tintaSobreAcento("#111318")).toBe("#ffffff");
  });

  it("respeita o corte em L = 0,6", () => {
    // Cinza logo abaixo e logo acima do corte.
    expect(tintaSobreAcento("#949494")).toBe("#ffffff");
    expect(tintaSobreAcento("#a5a5a5")).toBe("#14161a");
  });
});

describe("derivação dos tokens", () => {
  it("mantém --ac igual ao hex escolhido", () => {
    expect(derivarTokens(ACENTOS.rosa, "light").ac).toBe(ACENTOS.rosa);
  });

  it("no tema claro, --deep não passa de 34% de luminosidade", () => {
    for (const hex of Object.values(ACENTOS)) {
      expect(partesHsl(derivarTokens(hex, "light").deep).l).toBeLessThanOrEqual(34);
    }
  });

  it("no tema escuro, --deep tem pelo menos 74% de luminosidade", () => {
    for (const hex of Object.values(ACENTOS)) {
      expect(
        partesHsl(derivarTokens(hex, "dark").deep).l,
      ).toBeGreaterThanOrEqual(74);
    }
  });

  it("aplica o piso de saturação de 22% em acentos quase cinzas", () => {
    // Cinza puro: saturação zero. Sem o piso, --deep sairia cinza e sumiria.
    expect(partesHsl(derivarTokens("#808080", "light").deep).s).toBeGreaterThanOrEqual(22);
  });

  it("--chart2 fica a 38 graus de distância do acento", () => {
    const alvo = (rgbParaHsl(hexParaRgb(ACENTOS.azul)).h + 38) % 360;
    expect(partesHsl(derivarTokens(ACENTOS.azul, "dark").chart2).h).toBeCloseTo(alvo, 0);
  });

  /**
   * A armadilha nº 5 do handoff: no tema escuro, --ac e --deep não podem
   * coincidir, senão duas fatias do gráfico ficam iguais. Com acento quase
   * preto o --ac some no fundo — é por isso que --deep é clareado à força.
   */
  it("com acento quase preto, --deep continua visível no tema escuro", () => {
    const { l } = partesHsl(derivarTokens("#111318", "dark").deep);
    expect(l).toBeGreaterThanOrEqual(74);
  });

  it("--tint no tema escuro é translúcido, para não virar bloco chapado", () => {
    expect(derivarTokens(ACENTOS.verde, "dark").tint).toContain("/ .16");
  });
});
