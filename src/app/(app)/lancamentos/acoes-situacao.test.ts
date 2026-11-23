import { beforeEach, describe, expect, it, vi } from "vitest";
const banco = vi.hoisted(() => ({ gravados: [] as Record<string, unknown>[], acessos: 0 }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/agenda/sincronizar", () => ({
  apagarEventoOrfao: vi.fn(), enfileirar: vi.fn(), enfileirarApagarVarios: vi.fn(),
  LIMITE_NA_HORA: 15, sincronizarLancamentos: vi.fn(),
}));
vi.mock("@/lib/supabase/servidor", () => ({ criarClienteServidor: async () => {
  banco.acessos++;
  const q = {
    insert(dados: Record<string, unknown> | Record<string, unknown>[]) { banco.gravados.push(...(Array.isArray(dados) ? dados : [dados])); return q; },
    update(dados: Record<string, unknown>) { banco.gravados.push(dados); return q; },
    eq() { return q; }, select() { return q; },
    then<T>(resolver: (r: { data: { id: string }[]; error: null }) => T) {
      return Promise.resolve({ data: [{ id: "00000000-0000-4000-8000-000000000001" }], error: null }).then(resolver);
    },
  };
  return { auth: { getUser: async () => ({ data: { user: { id: "dono" } } }) }, from: () => q };
} }));

import { salvarLancamento, salvarRapido, type EntradaLancamento } from "./acoes";
const entrada: EntradaLancamento = {
  tipo: "despesa", valor: 100, descricao: "Conta antiga", data_registro: "2026-01-10",
  data_vencimento: "2026-02-10", situacao: "a_pagar", repeticao: { repeticao: "unica" },
};
beforeEach(() => { banco.gravados = []; banco.acessos = 0; });

describe("a gravação respeita a situação informada", () => {
  it("uma conta no passado continua a pagar", async () => {
    expect((await salvarLancamento(entrada)).ok).toBe(true);
    expect(banco.gravados[0]).toMatchObject({ situacao: "a_pagar", data_registro: "2026-01-10", data_vencimento: "2026-02-10" });
  });
  it("editar a data também preserva o status enviado", async () => {
    expect((await salvarLancamento({ ...entrada, id: "00000000-0000-4000-8000-000000000001" })).ok).toBe(true);
    expect(banco.gravados[0].situacao).toBe("a_pagar");
  });

  it("aceita editar a descrição importada de 200 caracteres e mantém o limite de 120 na criação", async () => {
    const descricao = "A".repeat(200);
    expect((await salvarLancamento({ ...entrada, descricao })).ok).toBe(false);
    expect(banco.acessos).toBe(0);
    expect((await salvarLancamento({ ...entrada, descricao, id: "00000000-0000-4000-8000-000000000001" })).ok).toBe(true);
    expect(banco.gravados[0].descricao).toBe(descricao);
  });
  it("todas as parcelas antigas continuam a pagar", async () => {
    expect((await salvarLancamento({ ...entrada, repeticao: { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 6 } })).ok).toBe(true);
    expect(banco.gravados).toHaveLength(6);
    expect(banco.gravados.every((l) => l.situacao === "a_pagar")).toBe(true);
  });
  it("recusa situação ausente ou incompatível, sem gravar nem adivinhar", async () => {
    expect((await salvarLancamento({ ...entrada, situacao: undefined } as unknown as EntradaLancamento)).ok).toBe(false);
    expect((await salvarLancamento({ ...entrada, tipo: "receita", situacao: "pago" })).ok).toBe(false);
    expect(banco.acessos).toBe(0);
    expect(banco.gravados).toEqual([]);
  });
  it("registro rápido salva a pagar e a receber quando escolhidos", async () => {
    expect((await salvarRapido(10, "despesa", null, "a_pagar")).ok).toBe(true);
    expect((await salvarRapido(20, "receita", null, "a_receber")).ok).toBe(true);
    expect(banco.gravados.map((l) => l.situacao)).toEqual(["a_pagar", "a_receber"]);
  });
  it("registro rápido não tem fallback para pago", async () => {
    expect((await salvarRapido(10, "despesa", null, undefined as unknown as "pago")).ok).toBe(false);
    expect((await salvarRapido(10, "receita", null, "pago")).ok).toBe(false);
    expect(banco.acessos).toBe(0);
  });
});
