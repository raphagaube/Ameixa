// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const rota = vi.hoisted(() => ({ caminho: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => rota.caminho }));
import { MenuPrincipal } from "./menu-principal";
import { BarraAbas } from "./barra-abas";
import { AvisoPendencias } from "./aviso-pendencias";

afterEach(cleanup);
beforeEach(() => { rota.caminho = "/"; });

describe("navegação organizada", () => {
  it("mantém a gestão visível e recolhe Bancos e Configurações no Início", () => {
    const { container } = render(<MenuPrincipal pendencias={3} />);
    expect(screen.getByRole("region", { name: "Minha gestão" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Pendências/ }).textContent).toBe("Pendências3");
    expect(Array.from(container.querySelectorAll("details")).every(el => !el.open)).toBe(true);
    expect(screen.queryByRole("link", { name: "Ajustes" })).toBeNull();
    expect(screen.queryByText("Atalhos")).toBeNull();
  });

  for (const [caminho, texto, grupo] of [
    ["/contas", "Contas", "Bancos"],
    ["/cartoes", "Cartões", "Bancos"],
    ["/configuracoes/google-agenda", "Google Agenda", "Configurações"],
    ["/categorias", "Categorias", "Configurações"],
  ]) {
    it(`abre o grupo e marca a página em ${caminho}`, () => {
      rota.caminho = caminho;
      render(<MenuPrincipal pendencias={0} />);
      const link = screen.getByRole("link", { name: texto });
      expect(link.getAttribute("aria-current")).toBe("page");
      expect(link.closest("details")?.open).toBe(true);
      expect(link.closest("details")?.querySelector("summary")?.textContent).toBe(grupo);
    });
  }

  for (const [caminho, texto] of [["/orcamentos", "Metas e orçamentos"], ["/importar", "Extrato"], ["/extrato/copias", "Extrato"]]) {
    it(`mantém a seção principal ativa em ${caminho}`, () => {
      rota.caminho = caminho; render(<MenuPrincipal pendencias={0} />);
      expect(screen.getByRole("link", { name: texto }).getAttribute("aria-current")).toBe("page");
    });
  }

  it("esconde o contador quando tudo está resolvido e mantém o acesso", () => {
    render(<MenuPrincipal pendencias={0} />);
    expect(screen.getByRole("link", { name: "Pendências" }).textContent).toBe("Pendências");
  });

  it("abre o menu pelo rodapé, sem navegar para uma página de Ajustes", async () => {
    const abrir = vi.fn(); render(<BarraAbas aoMenu={abrir} menuAberto={false} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Menu" }));
    expect(abrir).toHaveBeenCalledOnce();
    expect(screen.queryByRole("link", { name: "Ajustes" })).toBeNull();
  });
});

describe("aviso de pendências no Início", () => {
  it("só mostra o aviso quando há algo para completar", () => {
    const { rerender } = render(<AvisoPendencias quantidade={0} />);
    expect(screen.queryByRole("link")).toBeNull();
    rerender(<AvisoPendencias quantidade={2} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/pendencias");
    expect(screen.getByText("Você tem 2 lançamentos para completar")).toBeTruthy();
  });
});
