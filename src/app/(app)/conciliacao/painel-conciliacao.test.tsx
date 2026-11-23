// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Conta } from "@/lib/tipos/contas";
import { PainelConciliacao } from "./painel-conciliacao";

const banco = vi.hoisted(() => ({ range: vi.fn(), aplicar: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./acoes", () => ({ aplicarConciliacao: banco.aplicar }));
vi.mock("@/lib/supabase/servidor", () => ({
  criarClienteServidor: async () => ({ from: () => new Consulta() }),
}));

class Consulta {
  select() { return this; }
  eq() { return this; }
  neq() { return this; }
  gte() { return this; }
  lte() { return this; }
  order() { return this; }
  range = banco.range;
}

const contas: Conta[] = [1, 2].map((numero) => ({
  id: `10000000-0000-4000-8000-00000000000${numero}`,
  nome: `Banco ${numero}`,
  tipo: "corrente",
  cor: "#000000",
  saldo_inicial: 0,
  saldo_conferido_em: null,
  varias: false,
  qtd_contas: 1,
  tem_debito: true,
  tem_credito: false,
  tem_pix: true,
  cartoes: [],
}));

const EXTRATO = "<STMTTRN><DTPOSTED>20260901<TRNAMT>-50<FITID>A<MEMO>Mercado</STMTTRN>";

function arquivoOfx(ler = async () => EXTRATO) {
  const arquivo = new File([EXTRATO], "extrato.ofx");
  Object.defineProperty(arquivo, "text", { value: ler });
  return arquivo;
}

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("impede aplicar sugestões antigas quando a consulta à outra conta falha", async () => {
  const usuario = userEvent.setup();
  banco.range
    .mockResolvedValueOnce({ data: [], error: null })
    .mockResolvedValueOnce({ data: null, error: { message: "Conexão interrompida" } });
  render(<PainelConciliacao contas={contas} />);

  await usuario.upload(screen.getByLabelText("Escolher arquivo OFX ou QFX"), arquivoOfx());
  expect(await screen.findByRole("button", { name: "Aplicar conciliação" })).toBeTruthy();

  await usuario.selectOptions(screen.getByLabelText("Conta do extrato"), contas[1].id);

  expect((await screen.findByRole("alert")).textContent).toContain("Não deu para consultar");
  expect(screen.queryByRole("button", { name: "Aplicar conciliação" })).toBeNull();
  expect(banco.aplicar).not.toHaveBeenCalled();
});

it("aceita escolher o mesmo arquivo após uma falha de consulta", async () => {
  const usuario = userEvent.setup();
  const arquivo = arquivoOfx();
  banco.range
    .mockResolvedValueOnce({ data: null, error: { message: "Conexão interrompida" } })
    .mockResolvedValueOnce({ data: [], error: null });
  render(<PainelConciliacao contas={contas} />);

  await usuario.upload(screen.getByLabelText("Escolher arquivo OFX ou QFX"), arquivo);
  expect((await screen.findByRole("alert")).textContent).toContain("Não deu para consultar");
  expect(screen.queryByRole("button", { name: "Aplicar conciliação" })).toBeNull();

  await usuario.upload(screen.getByLabelText("extrato.ofx"), arquivo);
  expect(await screen.findByRole("button", { name: "Aplicar conciliação" })).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("bloqueia a troca de conta desde o início da leitura do arquivo", async () => {
  const usuario = userEvent.setup();
  const leitura = Promise.withResolvers<string>();
  banco.range.mockResolvedValue({ data: [], error: null });
  render(<PainelConciliacao contas={contas} />);

  await usuario.upload(screen.getByLabelText("Escolher arquivo OFX ou QFX"), arquivoOfx(() => leitura.promise));
  const seletor = screen.getByLabelText("Conta do extrato") as HTMLSelectElement;
  expect(seletor.disabled).toBe(true);
  expect(banco.range).not.toHaveBeenCalled();

  await act(async () => { leitura.resolve(EXTRATO); });
  expect(await screen.findByRole("button", { name: "Aplicar conciliação" })).toBeTruthy();
  expect(seletor.disabled).toBe(false);
});
