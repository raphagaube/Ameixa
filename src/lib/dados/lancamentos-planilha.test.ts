import { beforeEach, describe, expect, it, vi } from "vitest";
const banco = vi.hoisted(() => ({ linhas: [] as Record<string, unknown>[], falharEm: -1, paginas: [] as number[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/servidor", () => ({ criarClienteServidor: async () => ({ from: () => new Consulta() }) }));
class Consulta {
  filtros: ((l: Record<string, unknown>) => boolean)[] = [];
  select() { return this; }
  neq(c: string, v: unknown) { this.filtros.push(l => l[c] !== v); return this; }
  eq(c: string, v: unknown) { this.filtros.push(l => l[c] === v); return this; }
  gte(c: string, v: string) { this.filtros.push(l => String(l[c]) >= v); return this; }
  lte(c: string, v: string) { this.filtros.push(l => String(l[c]) <= v); return this; }
  order() { return this; }
  async range(de: number, ate: number) {
    banco.paginas.push(de);
    return de === banco.falharEm ? { data: null, error: "falha" } : { data: banco.linhas.filter(l => this.filtros.every(f => f(l))).slice(de, ate + 1), error: null };
  }
}
import { lancamentosDoPeriodo, lancamentosParaPlanilha } from "./lancamentos";
beforeEach(() => {
  banco.falharEm = -1; banco.paginas = [];
  banco.linhas = Array.from({ length: 1205 }, (_, i) => ({ id: String(i), tipo: "despesa", valor: "10.00", data_registro: "2026-09-01" }));
  banco.linhas.push({ id: "meta", tipo: "aporte", valor: 20 });
});
describe("planilha completa e fiel ao período", () => {
  it("exporta além dos limites da tela e do banco, sem contar aportes", async () => {
    const lista = await lancamentosParaPlanilha({ de: "2026-09-01", ate: "2026-09-30" });
    expect(lista).toHaveLength(1205); expect(banco.paginas).toEqual([0, 1000]);
    expect(lista?.some(l => l.tipo === "aporte")).toBe(false);
  });
  it("falha por inteiro quando a segunda página não chega", async () => {
    banco.falharEm = 1000;
    expect(await lancamentosParaPlanilha({})).toBeNull();
  });
  it("mantém o limite da tela e os filtros também no exportador", async () => {
    expect(await lancamentosDoPeriodo({})).toHaveLength(500);
    expect(await lancamentosParaPlanilha({ situacao: "a_pagar" })).toHaveLength(0);
  });
});
