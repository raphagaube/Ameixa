import { describe, expect, it } from "vitest";
import {
  AVISO_RETORNO,
  ESCOPOS,
  lerTokens,
  montarUrlAutorizacao,
  urlDeRetorno,
} from "./oauth";

const url = new URL(
  montarUrlAutorizacao({
    clientId: "123.apps.googleusercontent.com",
    urlDoSite: "https://ameixa.vercel.app",
    estado: "estado-sorteado",
  }),
);
const q = url.searchParams;

describe("URL de autorização", () => {
  it("vai para o Google", () => {
    expect(url.origin).toBe("https://accounts.google.com");
  });

  /**
   * Sem `access_type=offline` + `prompt=consent`, a segunda conexão devolve
   * código mas nenhum refresh token, e a integração morre uma hora depois.
   * Este teste existe para ninguém apagar isso num refactor.
   */
  it("pede a permissão duradoura", () => {
    expect(q.get("access_type")).toBe("offline");
    expect(q.get("prompt")).toBe("consent");
  });

  it("pede só as agendas que o próprio app criar", () => {
    expect(q.get("scope")).toContain("calendar.app.created");
    expect(q.get("scope")).not.toContain("auth/calendar ");
    expect(ESCOPOS).not.toContain("auth/calendar.events");
  });

  it("leva o estado, que é o que barra CSRF", () => {
    expect(q.get("state")).toBe("estado-sorteado");
  });

  it("manda o retorno para o endereço fixo do site", () => {
    expect(q.get("redirect_uri")).toBe(
      "https://ameixa.vercel.app/api/agenda/retorno",
    );
  });

  /** O Google compara byte a byte; barra sobrando dá redirect_uri_mismatch. */
  it("tolera barra no fim do endereço do site", () => {
    expect(urlDeRetorno("https://ameixa.vercel.app/")).toBe(
      "https://ameixa.vercel.app/api/agenda/retorno",
    );
  });
});

describe("leitura dos tokens", () => {
  const agora = new Date("2026-09-02T12:00:00Z");

  it("lê o que veio", () => {
    const t = lerTokens(
      { access_token: "a", refresh_token: "r", expires_in: 3600, scope: "s" },
      agora,
    );
    expect(t).toMatchObject({ access: "a", refresh: "r", escopos: "s" });
  });

  /** Um minuto de folga evita 401 em requisição já em voo. */
  it("vence um minuto antes do que o Google disse", () => {
    const t = lerTokens({ access_token: "a", expires_in: 3600 }, agora);
    expect(t!.expiraEm.toISOString()).toBe("2026-09-02T12:59:00.000Z");
  });

  it("sem refresh token avisa com null, sem inventar", () => {
    expect(lerTokens({ access_token: "a" }, agora)!.refresh).toBeNull();
  });

  it("resposta sem access token não vira sessão", () => {
    expect(lerTokens({ error: "invalid_grant" }, agora)).toBeNull();
  });
});

describe("avisos de retorno", () => {
  it("todo desfecho tem frase em português", () => {
    for (const [motivo, frase] of Object.entries(AVISO_RETORNO)) {
      expect(frase.length, motivo).toBeGreaterThan(10);
      expect(frase).not.toMatch(/error|invalid|failed/i);
    }
  });
});
