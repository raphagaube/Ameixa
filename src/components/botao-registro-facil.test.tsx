// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { CHAVE_POSICAO } from "@/lib/posicao-flutuante";
import { BotaoRegistroFacil } from "./botao-registro-facil";

afterEach(() => {
  cleanup();
  localStorage.removeItem(CHAVE_POSICAO);
});

function renderizarBotao() {
  const abrir = vi.fn();
  render(<BotaoRegistroFacil onClick={abrir} />);
  const botao = screen.getByRole("button", { name: /Registro fácil/ });
  Object.defineProperty(botao, "setPointerCapture", { value: vi.fn() });
  return { abrir, botao };
}

const toque = { pointerId: 1, pointerType: "touch", clientX: 300, clientY: 600 };

it("aguarda o clique do toque antes de abrir o Registro Fácil", () => {
  const { abrir, botao } = renderizarBotao();

  fireEvent.pointerDown(botao, toque);
  fireEvent.pointerUp(botao, toque);
  expect(abrir).not.toHaveBeenCalled();

  fireEvent.click(botao, { detail: 1 });
  expect(abrir).toHaveBeenCalledTimes(1);
});

it("mantém o Registro Fácil fechado quando o toque é cancelado", () => {
  const { abrir, botao } = renderizarBotao();

  fireEvent.pointerDown(botao, toque);
  fireEvent.pointerCancel(botao, toque);

  expect(abrir).not.toHaveBeenCalled();
});

it("salva a posição ao arrastar e permite abrir pelo teclado", async () => {
  const usuario = userEvent.setup();
  const { abrir, botao } = renderizarBotao();
  const destino = { ...toque, clientY: 520 };

  fireEvent.pointerDown(botao, toque);
  fireEvent.pointerMove(botao, destino);
  fireEvent.pointerUp(botao, destino);
  fireEvent.click(botao, { detail: 1 });

  expect(localStorage.getItem(CHAVE_POSICAO)).toContain('"deBaixo":152');
  expect(abrir).not.toHaveBeenCalled();

  botao.focus();
  await usuario.keyboard("{Enter}");
  expect(abrir).toHaveBeenCalledTimes(1);
});
