// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const acao = vi.hoisted(() => ({ salvar: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/(app)/lancamentos/acoes", () => ({ salvarRapido: acao.salvar }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: acao.refresh }) }));
import { RegistroFacil } from "./registro-facil";
beforeEach(() => { vi.clearAllMocks(); acao.salvar.mockResolvedValue({ ok: true, criados: 1 }); });
afterEach(cleanup);

describe("registro rápido sem situação presumida", () => {
  it("exige escolha ao salvar e envia exatamente a situação escolhida", async () => {
    const usuario = userEvent.setup();
    render(<RegistroFacil aberta aoFechar={vi.fn()} contas={[]} aoDetalhar={vi.fn()} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Já pago" }).getAttribute("aria-pressed")).toBe("false");
    await usuario.click(screen.getByRole("button", { name: "1" }));
    await usuario.click(screen.getByRole("button", { name: "Salvar e completar depois" }));
    expect(screen.getByRole("alert").textContent).toBe("Escolha a situação do lançamento.");
    expect(acao.salvar).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "A pagar" }));
    await usuario.click(screen.getByRole("button", { name: "Salvar e completar depois" }));
    await waitFor(() => expect(acao.salvar).toHaveBeenCalledWith(0.01, "despesa", null, "a_pagar"));
  });

  it("leva a situação escolhida ao formulário completo", async () => {
    const usuario = userEvent.setup(); const detalhar = vi.fn();
    render(<RegistroFacil aberta aoFechar={vi.fn()} contas={[]} aoDetalhar={detalhar} />);
    await usuario.click(screen.getByRole("button", { name: "1" }));
    await usuario.click(screen.getByRole("button", { name: "A pagar" }));
    await usuario.click(screen.getByRole("button", { name: "Adicionar detalhes agora" }));
    expect(detalhar).toHaveBeenCalledWith(0.01, "despesa", null, "a_pagar");
    expect(acao.salvar).not.toHaveBeenCalled();
  });
});
