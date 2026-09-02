// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Folha } from "./folha";

afterEach(cleanup);

/**
 * Reproduz o uso real: quem abre a gaveta passa `() => aoFechar(false)`,
 * uma função nova a cada renderização. Foi isso que fez o efeito rodar a
 * cada tecla e o foco pular do campo para o painel.
 */
function GavetaDeTeste() {
  const [aberta, setAberta] = useState(true);
  const [nome, setNome] = useState("");

  return (
    <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo="Nova categoria">
      <input
        aria-label="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
    </Folha>
  );
}

describe("Folha — o cursor não pode sair do campo", () => {
  /**
   * Regressão do relato: "digito um caractere, some a tela, o cursor não
   * mantém no campo". A causa era o efeito depender de `aoFechar`.
   */
  it("mantém o foco no campo depois de digitar", async () => {
    const usuario = userEvent.setup();
    render(<GavetaDeTeste />);

    const campo = screen.getByLabelText("Nome") as HTMLInputElement;
    await usuario.click(campo);
    expect(document.activeElement).toBe(campo);

    await usuario.type(campo, "A");
    expect(document.activeElement).toBe(campo);
  });

  it("mantém o foco depois de uma palavra inteira", async () => {
    const usuario = userEvent.setup();
    render(<GavetaDeTeste />);

    const campo = screen.getByLabelText("Nome") as HTMLInputElement;
    await usuario.click(campo);
    await usuario.type(campo, "Vestuário");

    expect(document.activeElement).toBe(campo);
    expect(campo.value).toBe("Vestuário");
  });

  /** Cada letra tem que chegar; nada pode ser perdido no caminho. */
  it("não perde caracteres", async () => {
    const usuario = userEvent.setup();
    render(<GavetaDeTeste />);

    const campo = screen.getByLabelText("Nome") as HTMLInputElement;
    await usuario.type(campo, "REFEIÇÕES FORA");

    expect(campo.value).toBe("REFEIÇÕES FORA");
  });

  it("Esc continua fechando", async () => {
    const usuario = userEvent.setup();
    render(<GavetaDeTeste />);

    expect(screen.getByRole("dialog")).toBeTruthy();
    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("devolve a rolagem da página ao fechar", async () => {
    const usuario = userEvent.setup();
    render(<GavetaDeTeste />);

    expect(document.body.style.overflow).toBe("hidden");
    await usuario.keyboard("{Escape}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
