// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AtualizarPeloAmeixa } from "./atualizar-pelo-ameixa";
import type { ResumoAtualizacao } from "./atualizar-ameixa";

const acao = vi.hoisted(() => vi.fn());
vi.mock("./atualizar-ameixa", () => ({ aplicarAtualizacao: acao }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/agenda/atualizar-na-tela", () => ({ atualizarAgendaNaTela: vi.fn().mockResolvedValue(0) }));

afterEach(() => {
  cleanup();
  acao.mockReset();
});

const resumo: Extract<ResumoAtualizacao, { ok: true }> = {
  ok: true,
  renomes: [],
  mudancas: [{ linha: 2, descricao: "Conta de luz", campos: ["valor"] }],
  problemas: [],
  semMudanca: 0,
  entradas: { quantidade: 0, jaNoApp: 0, itens: [] },
  exclusoes: {
    de: "2026-09-01", ate: "2026-09-30", quantidade: 1,
    itens: [{ descricao: "Mercado", data: "2026-09-04", tipo: "despesa", valor: 10 }],
    confirmacao: { ids: ["00000000-0000-4000-8000-000000000001"], corte: "2026-09-30T00:00:00.000Z" },
  },
};

function renderizar() {
  render(<AtualizarPeloAmeixa
    planilha={{ lancamentos: [], categorias: [], contas: [] }}
    resumo={resumo}
    nomeArquivo="planilha.xlsx"
    aoVoltar={vi.fn()}
  />);
  return userEvent.setup();
}

it("só envia a seleção de exclusões se o usuário marcar a opção", async () => {
  acao.mockResolvedValue({ ok: true, renomeados: 0, atualizados: 1, restantes: 0, excluidos: 1, criados: 0, falhas: [] });
  const usuario = renderizar();
  const opcao = screen.getByRole("checkbox", { name: "Excluir este lançamento" }) as HTMLInputElement;
  expect(opcao.checked).toBe(false);

  await usuario.click(opcao);
  await usuario.click(screen.getByRole("button", { name: "Aplicar e excluir 1" }));

  expect(acao).toHaveBeenCalledExactlyOnceWith(expect.any(Object), resumo.exclusoes.confirmacao);
  expect(await screen.findByText("Planilha aplicada")).toBeTruthy();
});

it("mostra a interrupção em vez de afirmar que a planilha foi aplicada", async () => {
  acao.mockResolvedValue({ ok: false, erro: "Não foi possível gravar." });
  const usuario = renderizar();

  await usuario.click(screen.getByRole("button", { name: "Aplicar mudanças" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível gravar.");
  expect(screen.queryByText("Planilha aplicada")).toBeNull();
  expect(acao).toHaveBeenCalledExactlyOnceWith(expect.any(Object), null);
});
