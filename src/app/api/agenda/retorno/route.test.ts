import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O teste de segurança da integração.
 *
 * A rota de retorno é a única da Ameixa que aceita ser chamada por um
 * redirecionamento vindo de fora. Sem a conferência do `state`, um link
 * forjado faria o app trocar o código de autorização de outra pessoa e
 * gravar a agenda dela na conta do dono. O que se verifica aqui não é só o
 * redirecionamento: é que **nenhuma requisição sai** quando a conferência
 * falha.
 */

const usuario = vi.fn(async () => ({ id: "user-1" }));
const gravar = vi.fn(async () => true);
const agendas = vi.fn(async () => ({ pagar: "cal-p", receber: "cal-r" }));

vi.mock("@/lib/supabase/servidor", () => ({
  usuarioAtual: () => usuario(),
  criarClienteServidor: async () => ({}),
}));
vi.mock("@/lib/agenda/credenciais", () => ({
  gravarConexao: (...a: unknown[]) => gravar(...(a as [])),
}));
vi.mock("@/lib/agenda/sincronizar", () => ({
  garantirAgendas: (...a: unknown[]) => agendas(...(a as [])),
}));
vi.mock("@/lib/agenda/config", () => ({
  configAgenda: () => ({
    clientId: "id",
    clientSecret: "segredo",
    urlDoSite: "https://ameixa.test",
    urlDeRetorno: "https://ameixa.test/api/agenda/retorno",
  }),
}));

const { GET } = await import("./route");
const { COOKIE_ESTADO } = await import("../conectar/route");

const fetchFalso = vi.fn();
vi.stubGlobal("fetch", fetchFalso);

function pedido(busca: string, cookie?: string) {
  const req = new NextRequest(
    `https://ameixa.test/api/agenda/retorno?${busca}`,
  );
  if (cookie) req.cookies.set(COOKIE_ESTADO, cookie);
  return req;
}

function motivo(r: Response): string | null {
  return new URL(r.headers.get("location")!).searchParams.get("agenda");
}

beforeEach(() => {
  fetchFalso.mockReset();
  gravar.mockClear();
  agendas.mockClear();
  usuario.mockResolvedValue({ id: "user-1" });
});

describe("conferência do estado", () => {
  it("sem estado nenhum, não fala com o Google", async () => {
    const r = await GET(pedido("code=abc"));
    expect(motivo(r)).toBe("estado-invalido");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("estado diferente do guardado, não fala com o Google", async () => {
    const r = await GET(pedido("code=abc&state=forjado", "verdadeiro"));
    expect(motivo(r)).toBe("estado-invalido");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("cookie sem o estado na volta, não fala com o Google", async () => {
    const r = await GET(pedido("code=abc", "verdadeiro"));
    expect(motivo(r)).toBe("estado-invalido");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("nunca grava credencial quando a conferência falha", async () => {
    await GET(pedido("code=abc&state=forjado", "verdadeiro"));
    expect(gravar).not.toHaveBeenCalled();
  });

  /** O cookie é de uso único: deixá-lo vivo reabriria a janela de ataque. */
  it("apaga o cookie do estado em qualquer desfecho", async () => {
    const r = await GET(pedido("code=abc&state=forjado", "verdadeiro"));
    expect(r.headers.get("set-cookie")).toContain(COOKIE_ESTADO);
  });
});

describe("desfechos", () => {
  const bom = { ok: true, json: async () => ({}) } as Response;

  it("cancelar no Google volta sem erro assustador", async () => {
    const r = await GET(pedido("error=access_denied&state=x", "x"));
    expect(motivo(r)).toBe("cancelado");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("sem refresh token avisa em vez de gravar meia conexão", async () => {
    fetchFalso.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "a", expires_in: 3600 }),
    } as Response);
    const r = await GET(pedido("code=abc&state=x", "x"));
    expect(motivo(r)).toBe("sem-refresh");
    expect(gravar).not.toHaveBeenCalled();
  });

  it("Google recusando o código não vira conexão", async () => {
    fetchFalso.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "invalid_grant" }),
    } as Response);
    const r = await GET(pedido("code=abc&state=x", "x"));
    expect(motivo(r)).toBe("erro");
    expect(gravar).not.toHaveBeenCalled();
  });

  it("rede fora não estoura exceção na cara do dono", async () => {
    fetchFalso.mockRejectedValueOnce(new Error("sem rede"));
    const r = await GET(pedido("code=abc&state=x", "x"));
    expect(motivo(r)).toBe("erro");
  });

  it("sem conseguir criar as agendas, não grava", async () => {
    fetchFalso.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "a", refresh_token: "r", expires_in: 3600 }),
    } as Response);
    agendas.mockResolvedValueOnce(null as never);
    const r = await GET(pedido("code=abc&state=x", "x"));
    expect(motivo(r)).toBe("sem-agenda");
    expect(gravar).not.toHaveBeenCalled();
  });

  it("caminho feliz grava e volta com ok", async () => {
    fetchFalso
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "a",
          refresh_token: "r",
          expires_in: 3600,
          scope: "calendar.app.created",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: "rapha@gmail.com" }),
      } as Response);

    const r = await GET(pedido("code=abc&state=x", "x"));
    expect(motivo(r)).toBe("ok");
    expect(gravar).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh: "r",
        pagar: "cal-p",
        receber: "cal-r",
        email: "rapha@gmail.com",
      }),
    );
  });

  /** Saber o e-mail é enfeite; não pode custar a conexão. */
  it("falha ao descobrir o e-mail não impede a conexão", async () => {
    fetchFalso
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "a", refresh_token: "r", expires_in: 3600 }),
      } as Response)
      .mockRejectedValueOnce(new Error("sem rede"));

    const r = await GET(pedido("code=abc&state=x", "x"));
    expect(motivo(r)).toBe("ok");
    expect(gravar).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
  });

  it("sem sessão manda entrar, não tenta conectar", async () => {
    usuario.mockResolvedValueOnce(null as never);
    const r = await GET(pedido("code=abc&state=x", "x"));
    expect(r.headers.get("location")).toContain("/entrar");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  void bom;
});
