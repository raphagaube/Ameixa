import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
import Ajustes from "./page";
describe("endereços antigos dos Ajustes", () => {
  it("leva o favorito antigo diretamente a Minha conta", async () => {
    await expect(Ajustes({ searchParams: Promise.resolve({}) })).rejects.toThrow("/configuracoes/minha-conta");
  });
  it("preserva o aviso do retorno antigo do Google Agenda", async () => {
    await expect(Ajustes({ searchParams: Promise.resolve({ agenda: "cancelado" }) })).rejects.toThrow("/configuracoes/google-agenda?agenda=cancelado");
  });
});
