// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const acao = vi.hoisted(() => ({ salvar: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/(app)/lancamentos/acoes", () => ({ salvarRapido: acao.salvar }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: acao.refresh }) }));
import { RegistroFacil } from "./registro-facil";
import type { Conta } from "@/lib/tipos/contas";
beforeEach(() => { vi.clearAllMocks(); acao.salvar.mockResolvedValue({ ok: true, criados: 1 }); });
afterEach(cleanup);

describe("registro rápido sem situação presumida", () => {
  it("exige escolha ao salvar e envia exatamente a situação escolhida", async () => {
    const usuario = userEvent.setup();
    render(<RegistroFacil aberta aoFechar={vi.fn()} contas={[]} aoDetalhar={vi.fn()} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("combobox", { name: "Situação" }) as HTMLSelectElement).value).toBe("");
    await usuario.click(screen.getByRole("button", { name: "1" }));
    await usuario.click(screen.getByRole("button", { name: "Salvar rápido e completar depois" }));
    expect(screen.getByRole("alert").textContent).toBe("Escolha a situação do lançamento.");
    expect(acao.salvar).not.toHaveBeenCalled();
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Situação" }), "a_pagar");
    await usuario.click(screen.getByRole("button", { name: "Salvar rápido e completar depois" }));
    await waitFor(() => expect(acao.salvar).toHaveBeenCalledWith(0.01, "despesa", null, "a_pagar"));
  });

  it("abre os detalhes sem valor nem situação e sem tentar salvar", async () => {
    const usuario = userEvent.setup(); const detalhar = vi.fn();
    render(<RegistroFacil aberta aoFechar={vi.fn()} contas={[]} aoDetalhar={detalhar} />);
    await usuario.click(screen.getByRole("button", { name: "Adicionar detalhes agora" }));
    expect(detalhar).toHaveBeenCalledWith(0, "despesa", null, null);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(acao.salvar).not.toHaveBeenCalled();
  });

  it("leva valor, tipo, banco e situação escolhidos ao formulário completo", async () => {
    const usuario = userEvent.setup(); const detalhar = vi.fn();
    const contas: Conta[] = Array.from({ length: 5 }, (_, i) => ({
      id: `conta-${i}`, nome: `Banco ${i}`, tipo: "corrente", cor: "#000000",
      saldo_inicial: 0, saldo_conferido_em: null, varias: false, qtd_contas: 1,
      tem_debito: true, tem_credito: false, tem_pix: true, cartoes: [],
    }));
    render(<RegistroFacil aberta aoFechar={vi.fn()} contas={contas} aoDetalhar={detalhar} />);
    await usuario.click(screen.getByRole("button", { name: "1" }));
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Tipo de lançamento" }), "receita");
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Situação" }), "a_receber");
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Conta ou banco (opcional)" }), "conta-4");
    await usuario.click(screen.getByRole("button", { name: "Adicionar detalhes agora" }));
    expect(detalhar).toHaveBeenCalledWith(0.01, "receita", "conta-4", "a_receber");
    expect(acao.salvar).not.toHaveBeenCalled();
  });

  it("continua exigindo valor ao salvar, mas permite sair do erro pelos detalhes", async () => {
    const usuario = userEvent.setup(); const detalhar = vi.fn();
    render(<RegistroFacil aberta aoFechar={vi.fn()} contas={[]} aoDetalhar={detalhar} />);
    await usuario.click(screen.getByRole("button", { name: "Salvar rápido e completar depois" }));
    expect(screen.getByRole("alert").textContent).toBe("Digite um valor primeiro.");
    await usuario.click(screen.getByRole("button", { name: "Adicionar detalhes agora" }));
    expect(detalhar).toHaveBeenCalledWith(0, "despesa", null, null);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(acao.salvar).not.toHaveBeenCalled();
  });

  it("Enter com foco em Detalhes abre o formulário sem disparar o atalho de salvar", async () => {
    const usuario = userEvent.setup(); const detalhar = vi.fn();
    render(<RegistroFacil aberta aoFechar={vi.fn()} contas={[]} aoDetalhar={detalhar} />);
    screen.getByRole("button", { name: "Adicionar detalhes agora" }).focus();
    await usuario.keyboard("{Enter}");
    expect(detalhar).toHaveBeenCalledWith(0, "despesa", null, null);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(acao.salvar).not.toHaveBeenCalled();
  });
});
