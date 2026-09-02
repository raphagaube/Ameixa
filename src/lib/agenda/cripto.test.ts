import { describe, expect, it } from "vitest";
import { chaveNova, cifrar, decifrar } from "./cripto";

const k = Buffer.from(chaveNova(), "base64");
const outra = Buffer.from(chaveNova(), "base64");

describe("cifragem do refresh token", () => {
  it("vai e volta", () => {
    const token = "1//0gABCDEFtoken-de-verdade-do-google";
    expect(decifrar(cifrar(token, k), k)).toBe(token);
  });

  /** O ponto todo: o que sai do banco não pode parecer com o token. */
  it("o texto cifrado não contém o original", () => {
    const token = "1//0gSEGREDO";
    expect(cifrar(token, k)).not.toContain("SEGREDO");
  });

  /** Cada cifragem tem iv próprio: dois iguais não viram o mesmo pacote. */
  it("não repete o pacote", () => {
    expect(cifrar("igual", k)).not.toBe(cifrar("igual", k));
  });

  it("chave errada não abre", () => {
    expect(() => decifrar(cifrar("x", k), outra)).toThrow();
  });

  /** O selo do GCM é o que detecta adulteração. */
  it("pacote adulterado é recusado", () => {
    const p = cifrar("x", k).split(".");
    p[2] = Buffer.from("outra coisa").toString("base64url");
    expect(() => decifrar(p.join("."), k)).toThrow();
  });

  it("pacote malformado é recusado", () => {
    expect(() => decifrar("nada disso", k)).toThrow();
    expect(() => decifrar("", k)).toThrow();
  });

  it("aguenta acento e texto longo", () => {
    const t = "ção".repeat(500);
    expect(decifrar(cifrar(t, k), k)).toBe(t);
  });

  it("a chave gerada tem 32 bytes", () => {
    expect(Buffer.from(chaveNova(), "base64")).toHaveLength(32);
  });
});
