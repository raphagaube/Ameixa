import { beforeEach, describe, expect, it, vi } from "vitest";

const banco = vi.hoisted(() => ({ ler: vi.fn(), apagar: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({
  criarClienteServidor: async () => ({
    from: (tabela: string) => ({
      select: () => ({ eq: banco.ler, in: banco.ler }),
      delete: () => ({ eq: (campo: string, valor: string) => banco.apagar(tabela, campo, valor) }),
    }),
  }),
}));

import { excluirCartao, excluirConta } from "./acoes";

const id = "00000000-0000-4000-8000-000000000001";
const cartoes = { data: [{ id }], error: null };
const semLancamentos = { count: 0, error: null };
const falha = { data: null, count: null, error: { message: "falha de leitura" } };

beforeEach(() => {
  vi.resetAllMocks();
  banco.apagar.mockResolvedValue({ error: null });
});

describe("exclusão de bancos e cartões", () => {
  it.each([
    { consulta: "cartões", respostas: [falha] },
    { consulta: "lançamentos do banco", respostas: [cartoes, falha, semLancamentos] },
    { consulta: "lançamentos dos cartões", respostas: [cartoes, semLancamentos, falha] },
  ])("preserva o banco se a consulta de $consulta falhar", async ({ respostas }) => {
    for (const resposta of respostas) banco.ler.mockResolvedValueOnce(resposta);

    expect(await excluirConta(id)).toMatchObject({ ok: false });
    expect(banco.apagar).not.toHaveBeenCalled();
  });

  it("preserva o cartão se a contagem dos lançamentos estiver indisponível", async () => {
    banco.ler.mockResolvedValue({ count: null, error: null });

    expect(await excluirCartao(id)).toMatchObject({ ok: false });
    expect(banco.apagar).not.toHaveBeenCalled();
  });

  it("permite excluir após conferir que não há lançamentos vinculados", async () => {
    banco.ler.mockResolvedValueOnce(cartoes).mockResolvedValue(semLancamentos);

    expect(await excluirConta(id)).toEqual({ ok: true });
    expect(await excluirCartao(id)).toEqual({ ok: true });
    expect(banco.apagar.mock.calls).toEqual([["contas", "id", id], ["cartoes", "id", id]]);
  });
});
