// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/logo-ameixa", () => ({ LogoAmeixa: () => null }));
import { MenuMovel } from "./menu-movel";
const originais = Object.fromEntries(["showModal", "close"].map(nome => [nome, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, nome)]));
beforeAll(() => {
  // JSDOM não implementa a API modal nativa; o teste cobre a integração
  // de foco e rolagem do componente. O modal real é conferido no Chrome.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterAll(() => {
  for (const nome of ["showModal", "close"]) {
    const original = originais[nome];
    if (original) Object.defineProperty(HTMLDialogElement.prototype, nome, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, nome);
  }
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("devolve o foco ao botão Menu e restaura a rolagem quando fecha", () => {
  const origem = document.createElement("button");
  document.body.append(origem);
  const rolagem = document.body.style.overflow;
  const { unmount } = render(<MenuMovel aoFechar={vi.fn()} aoLancar={vi.fn()} pendencias={0} botaoOrigem={{ current: origem }} />);
  screen.getByRole("button", { name: "Fechar menu" }).focus();
  expect(document.body.style.overflow).toBe("hidden");
  unmount();
  expect(document.activeElement).toBe(origem);
  expect(document.body.style.overflow).toBe(rolagem);
  origem.remove();
});
