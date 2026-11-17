import { beforeEach, expect, it, vi } from "vitest";
const banco = vi.hoisted(() => ({ linhas: [] as Record<string, unknown>[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/servidor", () => ({ criarClienteServidor: async () => ({ from: () => new Consulta() }) }));

// Interpreta os operadores PostgREST usados na consulta, sobre registros variados.
function partes(s: string) {
  let nivel = 0, inicio = 0;
  const lista: string[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") nivel++;
    if (s[i] === ")") nivel--;
    if (s[i] === "," && nivel === 0) { lista.push(s.slice(inicio, i)); inicio = i + 1; }
  }
  return [...lista, s.slice(inicio)];
}
function corresponde(l: Record<string, unknown>, s: string): boolean {
  if (s.startsWith("and(")) return partes(s.slice(4, -1)).every(p => corresponde(l, p));
  const [campo, op, ...resto] = s.split(".");
  const valor = resto.join(".");
  if (op === "eq") return String(l[campo]) === valor;
  if (op === "is") return valor === "null" && l[campo] === null;
  if (op === "in") return valor.slice(1, -1).split(",").includes(String(l[campo]));
  throw new Error(`Operador não esperado: ${op}`);
}
class Consulta {
  filtros: ((l: Record<string, unknown>) => boolean)[] = [];
  inicio = 0; fim = Infinity; head = false;
  select(_campos: string, opcoes?: { head?: boolean }) { this.head = !!opcoes?.head; return this; }
  eq(campo: string, valor: unknown) { this.filtros.push(l => l[campo] === valor); return this; }
  or(s: string) { this.filtros.push(l => partes(s).some(p => corresponde(l, p))); return this; }
  order() { return this; }
  range(de: number, ate: number) { this.inicio = de; this.fim = ate; return this; }
  then<T>(resolve: (r: { data: Record<string, unknown>[] | null; count: number; error: null }) => T) {
    const linhas = banco.linhas.filter(l => this.filtros.every(f => f(l)));
    return Promise.resolve(resolve({ data: this.head ? null : linhas.slice(this.inicio, this.fim + 1), count: linhas.length, error: null }));
  }
}
import { pendencias, contarPendencias } from "./lancamentos";
beforeEach(() => {
  banco.linhas = [
    { id: "ambos", incompleto: true, conta_id: null, tipo: "despesa", valor: 42 },
    { id: "so-conta", incompleto: false, conta_id: null, tipo: "receita", valor: 30 },
    { id: "so-incompleto", incompleto: true, conta_id: "banco", tipo: "despesa", valor: 20 },
    { id: "completo", incompleto: false, conta_id: "banco", tipo: "despesa", valor: 10 },
    { id: "aporte", incompleto: false, conta_id: null, tipo: "aporte", valor: 100 },
  ];
});

it("lista e contador reúnem as duas situações sem duplicar nem incluir aporte", async () => {
  expect((await pendencias()).map(l => l.id)).toEqual(["ambos", "so-conta", "so-incompleto"]);
  expect(await contarPendencias()).toBe(3);
});
it("mantém a consulta completa acima de mil pendências", async () => {
  banco.linhas = Array.from({ length: 1205 }, (_, i) => ({ id: String(i), incompleto: false, conta_id: null, tipo: "despesa", valor: 1 }));
  expect(await pendencias()).toHaveLength(1205);
  expect(await contarPendencias()).toBe(1205);
});
