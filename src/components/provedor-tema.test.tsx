// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProvedorTema, scriptAntiFlash, useTema } from "./provedor-tema";

function Controle() {
  const { modo, alternarModo } = useTema();
  return <button onClick={alternarModo}>{modo}</button>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-mode");
  document.documentElement.removeAttribute("style");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("preserva a escolha salva mesmo quando o sistema prefere o tema escuro", () => {
  localStorage.setItem("ameixa:modo", "light");
  render(<ProvedorTema><Controle /></ProvedorTema>);
  expect(document.documentElement.dataset.mode).toBe("light");
  fireEvent.click(screen.getByRole("button", { name: "light" }));
  expect(document.documentElement.dataset.mode).toBe("dark");
  expect(localStorage.getItem("ameixa:modo")).toBe("dark");
  cleanup();
  render(<ProvedorTema><Controle /></ProvedorTema>);
  expect(screen.getByRole("button", { name: "dark" })).toBeTruthy();
});

it("usa o tema do sistema sem reaplicar a cor livre antiga", () => {
  localStorage.setItem("ameixa:acento", "#00ff00");
  render(<ProvedorTema><Controle /></ProvedorTema>);
  expect(document.documentElement.dataset.mode).toBe("dark");
  expect(document.documentElement.style.getPropertyValue("--deep")).toBe("");
  expect(document.documentElement.style.getPropertyValue("--ac")).toBe("");
  // A preferência antiga não precisa ser apagada nem modificar o perfil.
  expect(localStorage.getItem("ameixa:acento")).toBe("#00ff00");
});

it("aplica a escolha salva antes da primeira pintura", () => {
  localStorage.setItem("ameixa:modo", "light");
  window.eval(scriptAntiFlash);
  expect(document.documentElement.dataset.mode).toBe("light");
  expect(document.documentElement.style.colorScheme).toBe("light");
});

it("mantém a alternância funcionando com armazenamento bloqueado", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("bloqueado"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("bloqueado"); });
  render(<ProvedorTema><Controle /></ProvedorTema>);
  fireEvent.click(screen.getByRole("button", { name: "dark" }));
  expect(document.documentElement.dataset.mode).toBe("light");
});
