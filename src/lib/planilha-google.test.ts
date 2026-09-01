import { describe, expect, it } from "vitest";
import { linkParaCsv, pareceHtml } from "./planilha-google";

const ID = "1AbC-dEfG_hIjKlMnOpQrStUvWxYz0123456789";

function url(r: ReturnType<typeof linkParaCsv>) {
  if (!r.ok) throw new Error(r.erro);
  return r.url;
}

describe("link de edição", () => {
  it("vira endereço de exportação em CSV", () => {
    const r = linkParaCsv(`https://docs.google.com/spreadsheets/d/${ID}/edit`);
    expect(url(r)).toBe(
      `https://docs.google.com/spreadsheets/d/${ID}/export?format=csv`,
    );
  });

  /** A aba escolhida vem depois do #, onde o navegador não passa como query. */
  it("preserva a aba escolhida vinda do #gid", () => {
    const r = linkParaCsv(
      `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=123456`,
    );
    expect(url(r)).toContain("gid=123456");
  });

  it("preserva a aba quando o gid vem como parâmetro", () => {
    const r = linkParaCsv(
      `https://docs.google.com/spreadsheets/d/${ID}/edit?gid=999`,
    );
    expect(url(r)).toContain("gid=999");
  });

  it("aceita link com barras a mais depois do id", () => {
    const r = linkParaCsv(
      `https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`,
    );
    expect(url(r)).toContain(ID);
  });
});

describe("link de planilha publicada", () => {
  it("usa o endereço pub com output=csv", () => {
    const r = linkParaCsv(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vABC/pubhtml",
    );
    expect(url(r)).toBe(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vABC/pub?output=csv",
    );
  });

  it("não confunde a publicada com a normal", () => {
    const r = linkParaCsv(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vABC/pubhtml",
    );
    expect(url(r)).toContain("/d/e/");
    expect(url(r)).toContain("output=csv");
  });
});

describe("links recusados", () => {
  it("campo vazio", () => {
    expect(linkParaCsv("   ").ok).toBe(false);
  });

  it("texto que não é link", () => {
    expect(linkParaCsv("minha planilha").ok).toBe(false);
  });

  /** Sem essa checagem, o link viraria um pedido para um servidor qualquer. */
  it("domínio de fora do Google", () => {
    const r = linkParaCsv("https://exemplo.com/spreadsheets/d/abc/edit");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("docs.google.com");
  });

  it("http sem s", () => {
    expect(linkParaCsv(`http://docs.google.com/spreadsheets/d/${ID}/edit`).ok).toBe(
      false,
    );
  });

  it("link do Google que não é planilha", () => {
    expect(linkParaCsv("https://docs.google.com/document/d/abc/edit").ok).toBe(false);
  });
});

describe("detecção de página de login", () => {
  /**
   * Planilha privada devolve HTML de login com status 200. Sem detectar,
   * o erro sairia como "nenhuma linha encontrada".
   */
  it("reconhece HTML no lugar do CSV", () => {
    expect(pareceHtml("<!DOCTYPE html><html><head>")).toBe(true);
    expect(pareceHtml("<html lang='pt'>")).toBe(true);
  });

  it("não confunde CSV de verdade com HTML", () => {
    expect(pareceHtml("Data;Descrição;Valor\n01/09/2026;Mercado;10")).toBe(false);
  });
});
