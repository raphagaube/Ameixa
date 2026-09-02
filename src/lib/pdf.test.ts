import { describe, expect, it } from "vitest";
import { nomeDoRelatorio } from "./pdf";

describe("nome do arquivo do relatório", () => {
  /** Sem o período no nome, vira "documento (3)" na pasta de downloads. */
  it("carrega o período dentro do nome", () => {
    expect(nomeDoRelatorio("2026-09-01", "2026-09-30")).toBe(
      "relatorio-ameixa-2026-09-01-a-2026-09-30.pdf",
    );
  });

  it("termina em .pdf", () => {
    expect(nomeDoRelatorio("2026-01-01", "2026-12-31").endsWith(".pdf")).toBe(true);
  });

  /** Espaço e acento atrapalham no WhatsApp e em servidor de e-mail. */
  it("não tem espaço nem acento", () => {
    const n = nomeDoRelatorio("2026-09-01", "2026-09-30");
    expect(n).not.toMatch(/\s/);
    expect(n).toBe(n.normalize("NFD").replace(/[̀-ͯ]/g, ""));
  });
});
