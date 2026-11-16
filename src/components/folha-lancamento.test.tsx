// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LancamentoNaLista, Situacao, TipoLancamento } from "@/lib/tipos/lancamentos";

const acoes = vi.hoisted(() => ({ salvar: vi.fn(), excluir: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/(app)/lancamentos/acoes", () => ({ salvarLancamento: acoes.salvar, excluirLancamento: acoes.excluir }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: acoes.refresh }) }));
import { FolhaLancamento } from "./folha-lancamento";

const dados = { contas: [], categorias: [], formas: [], metas: [] };
const existente = (tipo: TipoLancamento, situacao: Situacao): LancamentoNaLista => ({
  id: "00000000-0000-4000-8000-000000000001", tipo, situacao, valor: 30,
  descricao: "Conta antiga", data_registro: "2026-10-10", data_vencimento: null,
  categoria_id: null, subcategoria_id: null, conta_id: null, cartao_id: null,
  forma_pagamento: null, responsavel: null, observacao: null, meta_id: null,
  serie_id: null, serie_tipo: null, parcela_atual: null, parcela_total: null,
  incompleto: false, categoria: null, subcategoria: null, conta: null, cartao: null,
});

beforeEach(() => { vi.clearAllMocks(); acoes.salvar.mockResolvedValue({ ok: true, criados: 1 }); });
afterEach(cleanup);

describe("situação escolhida pelo usuário", () => {
  it("começa sem seleção e só avisa ao salvar", async () => {
    const usuario = userEvent.setup();
    render(<FolhaLancamento aberta aoFechar={vi.fn()} dados={dados} iniciais={{ valor: 30 }} />);
    expect(screen.getByRole("button", { name: "Já pago" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "A pagar" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("alert")).toBeNull();
    await usuario.type(screen.getByLabelText("Descrição"), "Conta antiga");
    await usuario.click(screen.getByRole("button", { name: "Salvar lançamento" }));
    expect(screen.getByRole("alert").textContent).toBe("Escolha a situação do lançamento.");
    expect(acoes.salvar).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "A pagar" }));
    expect(screen.queryByRole("alert")).toBeNull();
    await usuario.click(screen.getByRole("button", { name: "Salvar lançamento" }));
    await waitFor(() => expect(acoes.salvar).toHaveBeenCalledWith(expect.objectContaining({ situacao: "a_pagar" })));
  });

  for (const [tipo, situacao, rotulo] of [
    ["despesa", "a_pagar", "A pagar"], ["despesa", "pago", "Já pago"],
    ["receita", "a_receber", "A receber"], ["receita", "recebido", "Recebido"],
  ] as const) {
    it(`preserva ${situacao} ao trocar registro e vencimento para passado ou futuro`, async () => {
      const usuario = userEvent.setup();
      render(<FolhaLancamento aberta aoFechar={vi.fn()} dados={dados} lancamento={existente(tipo, situacao)} />);
      const ano = new Date().getFullYear();
      for (const a of [ano - 1, ano + 1, ano - 2]) {
        await usuario.selectOptions(screen.getByRole("combobox", { name: "Data do registro — ano" }), String(a));
        expect(screen.getByRole("button", { name: rotulo }).getAttribute("aria-pressed")).toBe("true");
      }
      await usuario.click(screen.getByRole("button", { name: "Sem vencimento — toque para definir" }));
      await usuario.selectOptions(screen.getByRole("combobox", { name: "Vencimento — ano" }), String(ano - 1));
      expect(screen.getByRole("button", { name: rotulo }).getAttribute("aria-pressed")).toBe("true");
      await usuario.click(screen.getByRole("button", { name: "Salvar lançamento" }));
      await waitFor(() => expect(acoes.salvar).toHaveBeenCalledWith(expect.objectContaining({
        situacao, data_registro: `${ano - 2}-10-10`,
      })));
    });
  }

  it("trocar para receita exige uma nova escolha, sem assumir recebimento", async () => {
    const usuario = userEvent.setup();
    render(<FolhaLancamento aberta aoFechar={vi.fn()} dados={dados} lancamento={existente("despesa", "pago")} />);
    await usuario.click(screen.getByRole("button", { name: "Receita" }));
    expect(screen.getByRole("button", { name: "Recebido" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "A receber" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("alert")).toBeNull();
    await usuario.click(screen.getByRole("button", { name: "Salvar lançamento" }));
    expect(acoes.salvar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Escolha a situação do lançamento.");
  });

  it("recebe a escolha feita no registro rápido sem redefini-la", () => {
    render(<FolhaLancamento aberta aoFechar={vi.fn()} dados={dados} iniciais={{ valor: 30, tipo: "receita", situacao: "a_receber" }} />);
    expect(screen.getByRole("button", { name: "A receber" }).getAttribute("aria-pressed")).toBe("true");
  });
});
