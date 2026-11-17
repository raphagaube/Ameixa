import { beforeEach, expect, it, vi } from "vitest";
const banco = vi.hoisted(() => ({ gravados: [] as Record<string, unknown>[], acesso: 0, subRemovidas: false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({ criarClienteServidor: async () => {
  banco.acesso++;
  return { auth: { getUser: async () => ({ data: { user: { id: "dono" } } }) }, from: (tabela: string) => {
    const q = {
      update(dados: Record<string, unknown>) { banco.gravados.push(dados); return q; },
      insert(dados: Record<string, unknown>) { banco.gravados.push(dados); return q; },
      delete() { banco.subRemovidas = true; return q; },
      eq() { return q; }, in() { return q; }, select() { return q; }, single() { return q; },
      then<T>(resolver: (r: { data: unknown; error: null }) => T) {
        return Promise.resolve({ data: tabela === "subcategorias" ? [{ id: "sub", nome: "Mercado" }] : { id: "categoria" }, error: null }).then(resolver);
      },
    }; return q;
  } };
} }));
import { salvarCategoria } from "./acoes";
const entrada = { id: "00000000-0000-4000-8000-000000000001", nome: "Compras", tipo: "despesa" as const,
  cor: "#53142D", cor_texto: "#000000", subcategorias: ["Mercado"] };
beforeEach(() => { banco.gravados = []; banco.acesso = 0; banco.subRemovidas = false; });

it("persiste o ícone e recalcula o automático no servidor sem recriar subcategorias", async () => {
  expect((await salvarCategoria({ ...entrada, icone: "103", cor_texto_modo: "auto" })).ok).toBe(true);
  expect(banco.gravados[0]).toMatchObject({ icone: "103", cor_texto: "#ffffff", cor_texto_modo: "auto" });
  expect(banco.gravados).toHaveLength(1);
  expect(banco.subRemovidas).toBe(false);
});
it("recusa identificadores fora da coleção antes de acessar o banco", async () => {
  expect((await salvarCategoria({ ...entrada, icone: "121" })).ok).toBe(false);
  expect((await salvarCategoria({ ...entrada, icone: "../../arquivo" })).ok).toBe(false);
  expect(banco.acesso).toBe(0);
});
it("permite Sem ícone e a escolha manual Preto", async () => {
  expect((await salvarCategoria({ ...entrada, icone: null, cor_texto_modo: "preto" })).ok).toBe(true);
  expect(banco.gravados[0]).toMatchObject({ icone: null, cor_texto: "#000000", cor_texto_modo: "preto" });
});
it("preserva a aparência de clientes antigos que não enviam os novos campos", async () => {
  expect((await salvarCategoria(entrada)).ok).toBe(true);
  expect(banco.gravados[0]).not.toHaveProperty("icone");
  expect(banco.gravados[0]).not.toHaveProperty("cor_texto_modo");
});
