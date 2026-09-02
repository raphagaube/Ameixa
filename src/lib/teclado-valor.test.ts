import { describe, expect, it } from "vitest";
import { acaoDaTecla } from "./teclado-valor";

describe("teclado do Registro Fácil", () => {
  it("número vira dígito", () => {
    for (const n of "0123456789") {
      expect(acaoDaTecla({ key: n })).toEqual({ tipo: "digito", valor: n });
    }
  });

  it("apaga com Backspace e com Delete", () => {
    expect(acaoDaTecla({ key: "Backspace" })).toEqual({ tipo: "apagar" });
    expect(acaoDaTecla({ key: "Delete" })).toEqual({ tipo: "apagar" });
  });

  it("Enter salva", () => {
    expect(acaoDaTecla({ key: "Enter" })).toEqual({ tipo: "salvar" });
  });

  /**
   * O erro que essa função existe para impedir: o dono aperta Tab até a
   * conta "Nubank", dá Enter para escolhê-la, e o lançamento é salvo com o
   * valor pela metade.
   */
  it("Enter com um botão em foco não salva", () => {
    expect(acaoDaTecla({ key: "Enter", alvo: "BUTTON" })).toBeNull();
  });

  it("não rouba as teclas de dentro de um campo de texto", () => {
    for (const alvo of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(acaoDaTecla({ key: "5", alvo })).toBeNull();
      expect(acaoDaTecla({ key: "Backspace", alvo })).toBeNull();
    }
  });

  /** Ctrl+R é recarregar, ⌘+1 troca de aba: nada disso é dígito. */
  it("ignora atalho do navegador", () => {
    expect(acaoDaTecla({ key: "1", metaKey: true })).toBeNull();
    expect(acaoDaTecla({ key: "5", ctrlKey: true })).toBeNull();
    expect(acaoDaTecla({ key: "9", altKey: true })).toBeNull();
  });

  it("letra e vírgula não fazem nada", () => {
    for (const k of ["a", "Z", ",", ".", "-", "+", "Tab", "ArrowUp", " "]) {
      expect(acaoDaTecla({ key: k }), k).toBeNull();
    }
  });
});
