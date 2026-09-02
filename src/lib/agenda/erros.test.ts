import { describe, expect, it } from "vitest";
import { classificarErro, esperaDaTentativa, MAX_TENTATIVAS } from "./erros";

/** Respostas reais do Google, na forma em que chegam. */
const INVALID_GRANT = {
  error: "invalid_grant",
  error_description: "Token has been expired or revoked.",
};
const RATE_LIMIT = {
  error: {
    errors: [{ reason: "rateLimitExceeded" }],
    message: "Rate Limit Exceeded",
  },
};
const QUOTA = {
  error: { errors: [{ reason: "quotaExceeded" }], message: "Quota exceeded" },
};
const SEM_PERMISSAO = {
  error: {
    errors: [{ reason: "insufficientPermissions" }],
    message: "Insufficient Permission",
  },
};
const NAO_ACHOU = {
  error: { errors: [{ reason: "notFound" }], message: "Not Found" },
};

describe("classificar a recusa do Google", () => {
  /** O que mata a integração de vez: precisa parar e avisar, não insistir. */
  it("token revogado ou expirado manda reconectar", () => {
    expect(classificarErro(400, INVALID_GRANT, "token")).toBe("reconectar");
  });

  it("401 numa chamada comum pede renovação do access token", () => {
    expect(classificarErro(401, {}, "evento")).toBe("renovar");
  });

  it("401 na troca de token já é reconectar", () => {
    expect(classificarErro(401, {}, "token")).toBe("reconectar");
  });

  it("escopo insuficiente manda reconectar", () => {
    expect(classificarErro(403, SEM_PERMISSAO)).toBe("reconectar");
  });

  it("excesso de requisições manda esperar", () => {
    expect(classificarErro(403, RATE_LIMIT)).toBe("esperar");
    expect(classificarErro(429, {})).toBe("esperar");
  });

  it("quota estourada manda esperar", () => {
    expect(classificarErro(403, QUOTA)).toBe("esperar");
  });

  it("erro do lado do Google manda esperar", () => {
    expect(classificarErro(503, {})).toBe("esperar");
  });

  it("evento apagado no Google é tratado à parte da agenda apagada", () => {
    expect(classificarErro(404, NAO_ACHOU, "evento")).toBe("evento-sumiu");
    expect(classificarErro(404, NAO_ACHOU, "agenda")).toBe("agenda-sumiu");
    expect(classificarErro(410, NAO_ACHOU, "agenda")).toBe("agenda-sumiu");
  });

  it("credencial errada não adianta tentar de novo", () => {
    expect(classificarErro(401, { error: "invalid_client" }, "token")).toBe(
      "desistir",
    );
    expect(classificarErro(400, {})).toBe("desistir");
  });

  it("corpo ilegível não derruba a classificação", () => {
    expect(classificarErro(500, null)).toBe("esperar");
    expect(classificarErro(400, undefined)).toBe("desistir");
  });
});

describe("espera entre tentativas", () => {
  it("cresce a cada tentativa", () => {
    const a = esperaDaTentativa(0, 0.5);
    const b = esperaDaTentativa(1, 0.5);
    const c = esperaDaTentativa(2, 0.5);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  /** Sem sacudida, duas abas voltariam no mesmo milissegundo. */
  it("sacode o valor", () => {
    expect(esperaDaTentativa(3, 0)).not.toBe(esperaDaTentativa(3, 1));
  });

  it("tem teto, para não esperar uma hora", () => {
    expect(esperaDaTentativa(30, 1)).toBeLessThanOrEqual(90_000);
  });

  it("desiste em algum momento", () => {
    expect(MAX_TENTATIVAS).toBeGreaterThan(1);
    expect(MAX_TENTATIVAS).toBeLessThan(10);
  });
});
