// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { Folha } from "./folha";

afterEach(cleanup);

function Pagina() {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)}>Abrir</button>
      <button type="button">Fundo da página</button>
      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo="Formulário">
        <button type="button">Salvar</button>
        <button type="button" disabled>Indisponível</button>
      </Folha>
    </>
  );
}

it("mantém o Tab no diálogo e devolve o foco ao botão de origem", async () => {
  const usuario = userEvent.setup();
  render(<Pagina />);
  const abrir = screen.getByRole("button", { name: "Abrir" });
  await usuario.click(abrir);
  const folha = screen.getByRole("dialog", { name: "Formulário" });
  const { getByRole } = within(folha);
  const fechar = getByRole("button", { name: "Fechar" });
  const salvar = getByRole("button", { name: "Salvar" });
  for (const botao of [fechar, salvar]) {
    // O jsdom não calcula layout. Esses dois botões estão visíveis na folha.
    Object.defineProperty(botao, "getClientRects", { value: () => [{ width: 20, height: 20 }] });
  }

  expect(document.activeElement).toBe(folha);
  await usuario.tab({ shift: true });
  expect(document.activeElement).toBe(salvar);
  await usuario.tab();
  expect(document.activeElement).toBe(fechar);
  await usuario.keyboard("{Escape}");
  expect(document.activeElement).toBe(abrir);
});
