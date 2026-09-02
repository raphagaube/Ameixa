import { describe, expect, it } from "vitest";
import {
  MIN_DE_BAIXO,
  PADRAO,
  foiArrasto,
  ladoMaisProximo,
  ler,
  prender,
} from "./posicao-flutuante";

describe("prender dentro da tela", () => {
  it("não deixa descer abaixo da barra de abas", () => {
    expect(prender(0, 800, 52)).toBe(MIN_DE_BAIXO);
    expect(prender(-100, 800, 52)).toBe(MIN_DE_BAIXO);
  });

  it("não deixa subir além do topo", () => {
    expect(prender(5000, 800, 52)).toBe(800 - 52 - 16);
  });

  it("mantém a posição escolhida quando ela cabe", () => {
    expect(prender(300, 800, 52)).toBe(300);
  });

  /** Tela minúscula não pode gerar um teto menor que o piso. */
  it("tela muito baixa não inverte os limites", () => {
    expect(prender(300, 100, 52)).toBe(MIN_DE_BAIXO);
  });
});

describe("encostar na borda", () => {
  it("à esquerda do meio, encosta à esquerda", () => {
    expect(ladoMaisProximo(50, 400)).toBe("esquerda");
  });

  it("à direita do meio, encosta à direita", () => {
    expect(ladoMaisProximo(350, 400)).toBe("direita");
  });

  it("exatamente no meio vai para a direita", () => {
    expect(ladoMaisProximo(200, 400)).toBe("direita");
  });
});

describe("toque contra arrasto", () => {
  /** Sem isto, todo arrasto terminaria abrindo o Registro Fácil. */
  it("movimento pequeno é toque", () => {
    expect(foiArrasto(2, 3)).toBe(false);
    expect(foiArrasto(0, 0)).toBe(false);
  });

  it("movimento grande é arrasto", () => {
    expect(foiArrasto(40, 0)).toBe(true);
    expect(foiArrasto(0, 40)).toBe(true);
  });

  it("conta a distância na diagonal, não em cada eixo", () => {
    expect(foiArrasto(7, 7)).toBe(true);
  });
});

describe("leitura do que ficou guardado", () => {
  it("sem nada guardado, usa o padrão", () => {
    expect(ler(null)).toEqual(PADRAO);
  });

  it("texto quebrado não derruba o app", () => {
    expect(ler("{{{")).toEqual(PADRAO);
  });

  it("lê o que foi guardado", () => {
    expect(ler(JSON.stringify({ lado: "esquerda", deBaixo: 300 }))).toEqual({
      lado: "esquerda",
      deBaixo: 300,
    });
  });

  it("lado inválido volta para a direita", () => {
    expect(ler(JSON.stringify({ lado: "meio", deBaixo: 200 })).lado).toBe("direita");
  });

  it("distância inválida volta para o padrão", () => {
    expect(ler(JSON.stringify({ lado: "direita", deBaixo: "x" })).deBaixo).toBe(
      PADRAO.deBaixo,
    );
  });

  it("distância negativa é elevada ao mínimo", () => {
    expect(ler(JSON.stringify({ lado: "direita", deBaixo: -50 })).deBaixo).toBe(
      MIN_DE_BAIXO,
    );
  });
});
