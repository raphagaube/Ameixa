import { describe, expect, it } from "vitest";
import { corTextoCategoria, tintaCategoria } from "./cores-categoria";

describe("contraste da categoria", () => {
  it("usa branco sobre fundo escuro e preto sobre fundo claro", () => {
    expect(tintaCategoria("#53142D")).toBe("#ffffff");
    expect(tintaCategoria("#000000")).toBe("#ffffff");
    expect(tintaCategoria("#ffffff")).toBe("#000000");
    expect(tintaCategoria("#8FB3D9")).toBe("#000000");
  });
  it("respeita a escolha manual mesmo quando contraria o automático", () => {
    expect(corTextoCategoria("#000000", "preto")).toBe("#000000");
    expect(corTextoCategoria("#ffffff", "branco")).toBe("#ffffff");
    expect(corTextoCategoria("#53142D", "auto")).toBe("#ffffff");
  });
});
