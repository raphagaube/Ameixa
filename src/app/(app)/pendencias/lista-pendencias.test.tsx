// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";
const editar = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/casca-lancamentos", () => ({ useFormularioLancamento: () => ({ editar }) }));
vi.mock("@/app/(app)/lancamentos/acoes", () => ({ excluirLancamento: vi.fn() }));
import { ListaPendencias } from "./lista-pendencias";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("mostra Tudo em dia quando não há lançamentos para completar", () => {
  render(<ListaPendencias lista={[]} />);
  expect(screen.getByRole("heading", { name: "Tudo em dia" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Completar" })).toBeNull();
});
it("identifica o que falta e abre o lançamento certo para completar", async () => {
  const item = { id: "1", valor: 20, tipo: "despesa", descricao: "Gasto rápido", data_registro: "2026-11-16", conta: null, conta_id: null, categoria_id: null, forma_pagamento: null } as LancamentoNaLista;
  render(<ListaPendencias lista={[item]} />);
  for (const campo of ["categoria", "conta", "forma de pagamento", "descrição"]) expect(screen.getByText(`falta ${campo}`)).toBeTruthy();
  await userEvent.setup().click(screen.getByRole("button", { name: "Completar" }));
  expect(editar).toHaveBeenCalledWith(item);
});
