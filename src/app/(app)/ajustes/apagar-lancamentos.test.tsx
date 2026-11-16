// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const acao = vi.hoisted(() => ({ preparar: vi.fn(), excluir: vi.fn(), atualizar: vi.fn(), refresh: vi.fn() }));
vi.mock("./exclusao", () => ({ prepararExclusao: acao.preparar, excluirLoteConfirmado: acao.excluir }));
vi.mock("./exportar-dados", () => ({ ExportarDados: () => <button>Baixar backup dos meus dados</button> }));
vi.mock("@/lib/agenda/atualizar-na-tela", () => ({ atualizarAgendaNaTela: acao.atualizar }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: acao.refresh }) }));
import { ApagarLancamentos } from "./apagar-lancamentos";

const ids = (n: number, inicio = 0) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(inicio + i).padStart(12, "0")}`);
const corte = "2026-11-16T12:00:00.000Z";
const pagina = (lista = ids(2), proxima: string | null = null) => ({ ok: true, ids: lista, total: lista.length, ateCriadoEm: corte, proxima });
beforeEach(() => {
  vi.clearAllMocks();
  acao.preparar.mockResolvedValue(pagina());
  acao.excluir.mockImplementation(async (_f, lista: string[]) => ({ ok: true, excluidos: lista.length, ignorados: 0, avisoAgenda: false }));
  acao.atualizar.mockResolvedValue(0);
});
afterEach(cleanup);

describe("confirmação antes da exclusão", () => {
  it("conferir e cancelar nunca excluem lançamentos", async () => {
    const usuario = userEvent.setup(); render(<ApagarLancamentos />);
    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
    await usuario.click(screen.getByRole("button", { name: "Conferir lançamentos" }));
    await screen.findByRole("region", { name: "Confirmação da exclusão" });
    expect(acao.excluir).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("region", { name: "Confirmação da exclusão" })).toBeNull();
    expect(acao.excluir).not.toHaveBeenCalled();
  });

  it("uma mudança de alcance invalida a confirmação anterior", async () => {
    const usuario = userEvent.setup(); render(<ApagarLancamentos />);
    await usuario.click(screen.getByRole("button", { name: "Conferir lançamentos" }));
    await screen.findByRole("button", { name: "Excluir 2 lançamentos" });
    await usuario.click(screen.getByRole("button", { name: "Todo o histórico" }));
    expect(screen.queryByRole("button", { name: "Excluir 2 lançamentos" })).toBeNull();
    expect(acao.excluir).not.toHaveBeenCalled();
  });

  it("mostra a quantidade completa e exclui mais de mil em lotes só depois de confirmar", async () => {
    const usuario = userEvent.setup();
    const todos = ids(1203);
    acao.preparar.mockReset();
    for (let i = 0; i < todos.length; i += 400) {
      const lote = todos.slice(i, i + 400);
      acao.preparar.mockResolvedValueOnce(pagina(lote, lote.length === 400 ? lote[lote.length - 1] : null));
    }
    render(<ApagarLancamentos />);
    await usuario.click(screen.getByRole("button", { name: "Todo o histórico" }));
    await usuario.click(screen.getByRole("button", { name: "Conferir lançamentos" }));
    const confirmar = await screen.findByRole("button", { name: "Excluir 1.203 lançamentos" });
    expect(acao.excluir).not.toHaveBeenCalled();
    await usuario.click(confirmar);
    await waitFor(() => expect(acao.excluir).toHaveBeenCalledTimes(4));
    expect(acao.excluir.mock.calls.map((c) => c[1].length)).toEqual([400, 400, 400, 3]);
    expect(acao.excluir.mock.calls.flatMap((c) => c[1])).toEqual(todos);
    expect(acao.excluir.mock.calls.every((c) => c[2] === corte)).toBe(true);
    await screen.findByText("1.203 lançamentos excluídos.");
  });

  it("seleção vazia não oferece botão para excluir", async () => {
    acao.preparar.mockResolvedValue(pagina([]));
    const usuario = userEvent.setup(); render(<ApagarLancamentos />);
    await usuario.click(screen.getByRole("button", { name: "Conferir lançamentos" }));
    await screen.findByText("Nenhum lançamento encontrado para esta seleção.");
    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
  });

  it("interrompe na primeira falha e informa a exclusão parcial sem repetir pedidos", async () => {
    const usuario = userEvent.setup(); const lista = ids(800);
    acao.preparar.mockReset();
    acao.preparar.mockResolvedValueOnce(pagina(lista.slice(0, 400), lista[399]));
    acao.preparar.mockResolvedValueOnce(pagina(lista.slice(400)));
    acao.excluir.mockResolvedValueOnce({ ok: true, excluidos: 400, ignorados: 0, avisoAgenda: false });
    acao.excluir.mockResolvedValueOnce({ ok: false, erro: "Falha de rede." });
    render(<ApagarLancamentos />);
    await usuario.click(screen.getByRole("button", { name: "Conferir lançamentos" }));
    await usuario.click(await screen.findByRole("button", { name: "Excluir 800 lançamentos" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("400 lançamentos excluídos até agora"));
    expect(acao.excluir).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
  });
});
