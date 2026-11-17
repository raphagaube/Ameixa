// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const acoes = vi.hoisted(() => ({ salvar: vi.fn(), excluir: vi.fn() }));
vi.mock("./acoes", () => ({ salvarCategoria: acoes.salvar, excluirCategoria: acoes.excluir }));
import { FolhaCategoria } from "./folha-categoria";
import type { Categoria } from "@/lib/tipos/categorias";
beforeEach(() => { vi.clearAllMocks(); acoes.salvar.mockResolvedValue({ ok: true }); });
afterEach(cleanup);
const existente: Categoria = {
  id: "00000000-0000-4000-8000-000000000001", nome: "Alimentação", tipo: "despesa",
  cor: "#53142D", cor_texto: "#000000", cor_texto_modo: "preto", icone: "001", ordem: 1,
  subcategorias: [{ id: "sub-existente", nome: "Mercado" }],
};

it("oferece os 120 originais e salva ícone com contraste automático", async () => {
  const usuario = userEvent.setup(); const fechar = vi.fn();
  render(<FolhaCategoria categoria={null} aoFechar={fechar} />);
  await usuario.type(screen.getByLabelText("Nome"), "Compras");
  fireEvent.change(screen.getByLabelText("Escolher cor da categoria"), { target: { value: "#53142d" } });
  await usuario.click(screen.getByRole("button", { name: "Ícone Sem ícone" }));
  expect(screen.getAllByRole("button", { name: /^Ícone \d{3}:/ })).toHaveLength(120);
  expect(screen.queryByRole("link")).toBeNull();
  await usuario.type(screen.getByRole("textbox", { name: "Buscar ícone" }), "120");
  await usuario.click(screen.getByRole("button", { name: /^Ícone 120:/ }));
  expect(screen.queryByRole("region", { name: "Escolher ícone da categoria" })).toBeNull();
  await usuario.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(acoes.salvar).toHaveBeenCalledWith(expect.objectContaining({
    nome: "Compras", icone: "120", cor_texto: "#ffffff", cor_texto_modo: "auto",
  })));
  expect(fechar).toHaveBeenCalledWith(true);
});

it("preserva a tinta manual ao reabrir e editar a cor e mantém subcategorias", async () => {
  const usuario = userEvent.setup();
  render(<FolhaCategoria categoria={existente} aoFechar={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Preto" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(screen.getByLabelText("Escolher cor da categoria"), { target: { value: "#111111" } });
  await usuario.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(acoes.salvar).toHaveBeenCalledWith(expect.objectContaining({
    icone: "001", cor_texto: "#000000", cor_texto_modo: "preto", subcategorias: ["Mercado"],
  })));
});

it("permite retirar o ícone e escolher Branco", async () => {
  const usuario = userEvent.setup();
  render(<FolhaCategoria categoria={existente} aoFechar={vi.fn()} />);
  await usuario.click(screen.getByRole("button", { name: /^Ícone Compras/ }));
  await usuario.click(screen.getByRole("button", { name: "Sem ícone" }));
  await usuario.click(screen.getByRole("button", { name: "Branco" }));
  await usuario.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(acoes.salvar).toHaveBeenCalledWith(expect.objectContaining({
    icone: null, cor_texto: "#ffffff", cor_texto_modo: "branco",
  })));
});
