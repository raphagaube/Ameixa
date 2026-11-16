import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  usuario: "dono" as string | null,
  linhas: [] as Record<string, unknown>[],
  eventos: [] as Record<string, unknown>[],
  fila: [] as Record<string, unknown>[],
  chamadas: [] as string[],
  falha: "",
  antesDeApagar: null as (() => void) | null,
}));

class Consulta {
  filtros: ((l: Record<string, unknown>) => boolean)[] = [];
  acao = "ler";
  maximo = Infinity;
  contar = false;
  ordenar = false;
  cargas: Record<string, unknown>[] = [];
  constructor(readonly tabela: string) {}
  select(_campos: string, opcoes?: { count?: string }) { this.contar = opcoes?.count === "exact"; return this; }
  eq(c: string, v: unknown) { this.filtros.push((l) => l[c] === v); return this; }
  gte(c: string, v: string) { this.filtros.push((l) => String(l[c]) >= v); return this; }
  lte(c: string, v: string) { this.filtros.push((l) => String(l[c]) <= v); return this; }
  gt(c: string, v: string) { this.filtros.push((l) => String(l[c]) > v); return this; }
  in(c: string, vs: unknown[]) { this.filtros.push((l) => vs.includes(l[c])); return this; }
  order() { this.ordenar = true; return this; }
  limit(n: number) { this.maximo = n; return this; }
  delete() { this.acao = "apagar"; return this; }
  insert(cargas: Record<string, unknown>[]) { this.acao = "inserir"; this.cargas = cargas; return this; }
  async executar() {
    estado.chamadas.push(`${this.tabela}:${this.acao}`);
    if (estado.falha === `${this.tabela}:${this.acao}`) return { data: null, count: null, error: { message: "erro de teste" } };
    if (this.acao === "inserir") { estado.fila.push(...this.cargas); return { data: null, count: null, error: null }; }
    if (this.acao === "apagar") estado.antesDeApagar?.();
    let linhas = (this.tabela === "eventos_agenda" ? estado.eventos : estado.linhas).filter((l) => this.filtros.every((f) => f(l)));
    const total = linhas.length;
    if (this.ordenar) linhas = linhas.toSorted((a, b) => String(a.id).localeCompare(String(b.id)));
    linhas = linhas.slice(0, this.maximo);
    if (this.acao === "apagar") {
      const ids = new Set(linhas.map((l) => l.id));
      estado.linhas = estado.linhas.filter((l) => !ids.has(l.id));
    }
    return { data: linhas, count: this.contar ? total : null, error: null };
  }
  then<T>(resolver: (r: Awaited<ReturnType<Consulta["executar"]>>) => T) { return this.executar().then(resolver); }
}

vi.mock("@/lib/supabase/servidor", () => ({ criarClienteServidor: async () => ({
  auth: { getUser: async () => ({ data: { user: estado.usuario ? { id: estado.usuario } : null } }) },
  from: (tabela: string) => new Consulta(tabela),
}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/agenda/sincronizar", () => ({ drenarFila: vi.fn() }));

import { excluirLoteConfirmado, prepararExclusao } from "./exclusao";

const corte = "2026-11-16T12:00:00.000Z";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const linha = (n: number, extra: Record<string, unknown> = {}) => ({
  id: id(n), user_id: "dono", data_registro: "2026-09-15", criado_em: "2026-09-01T00:00:00.000Z",
  atualizado_em: "2026-09-01T00:00:00.000Z", situacao: "pago", tipo: "despesa", ...extra,
});

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(corte));
  estado.usuario = "dono"; estado.linhas = []; estado.eventos = []; estado.fila = [];
  estado.chamadas = []; estado.falha = ""; estado.antesDeApagar = null;
});
afterEach(() => vi.useRealTimers());

describe("exclusão de lançamentos nos Ajustes", () => {
  it("recusa datas inexistentes, período invertido e lotes grandes", async () => {
    for (const filtro of [
      { alcance: "periodo", de: "2026-02-30", ate: "2026-03-01" },
      { alcance: "periodo", de: "2026-10-01", ate: "2026-09-01" },
    ]) expect((await prepararExclusao(filtro)).ok).toBe(false);
    expect((await excluirLoteConfirmado({ alcance: "todos" }, Array.from({ length: 401 }, (_, i) => id(i)), corte)).ok).toBe(false);
    expect(estado.chamadas).toEqual([]);
  });

  it("exige sessão inclusive para preparar a prévia", async () => {
    estado.usuario = null;
    expect((await prepararExclusao({ alcance: "todos" })).ok).toBe(false);
    expect((await excluirLoteConfirmado({ alcance: "todos" }, [id(1)], corte)).ok).toBe(false);
    expect(estado.chamadas).toEqual([]);
  });

  it("a prévia alcança mais de mil registros, sem apagar nem incluir outra conta ou novos registros", async () => {
    estado.linhas = Array.from({ length: 1205 }, (_, n) => linha(n));
    estado.linhas.push(linha(2000, { user_id: "outra" }), linha(2001, { criado_em: "2026-11-16T12:01:00.000Z" }));
    const ids: string[] = [];
    let cursor;
    do {
      const r = await prepararExclusao({ alcance: "todos" }, cursor);
      if (!r.ok) throw new Error(r.erro);
      if (!cursor) expect(r.total).toBe(1205);
      ids.push(...r.ids);
      cursor = r.proxima ? { ateCriadoEm: r.ateCriadoEm, apos: r.proxima } : undefined;
    } while (cursor);
    expect(new Set(ids).size).toBe(1205);
    expect(estado.linhas).toHaveLength(1207);
    expect(estado.chamadas.every((c) => c === "lancamentos:ler")).toBe(true);
  });

  it("apaga os limites inclusivos pelo registro, todos os tipos e situações, preservando outras contas e alterações recentes", async () => {
    estado.linhas = [
      linha(1, { data_registro: "2026-09-01" }),
      linha(2, { data_registro: "2026-09-30", situacao: "a_pagar" }),
      linha(3, { tipo: "aporte", situacao: "guardado" }),
      linha(4, { data_registro: "2026-10-01", data_vencimento: "2026-09-20" }),
      linha(5, { user_id: "outra" }),
      linha(6, { atualizado_em: "2026-11-16T12:01:00.000Z" }),
      linha(7, { criado_em: "2026-11-16T12:01:00.000Z" }),
    ];
    estado.eventos = [1, 2, 5, 6].map((n) => ({ lancamento_id: id(n), user_id: n === 5 ? "outra" : "dono", calendario_id: "agenda", evento_id: String(n) }));
    const r = await excluirLoteConfirmado({ alcance: "periodo", de: "2026-09-01", ate: "2026-09-30" }, estado.linhas.map((l) => l.id), corte);
    expect(r).toEqual({ ok: true, excluidos: 3, ignorados: 4, avisoAgenda: false });
    expect(estado.linhas.map((l) => l.id)).toEqual([4, 5, 6, 7].map(id));
    expect(estado.fila.map((f) => f.carga)).toEqual([
      { calendario_id: "agenda", evento_id: "1" }, { calendario_id: "agenda", evento_id: "2" },
    ]);
    expect(estado.chamadas.some((c) => /contas|cartoes|categorias|metas/.test(c))).toBe(false);
  });

  it("repete os filtros no DELETE se alguém editar entre a leitura e a exclusão", async () => {
    estado.linhas = [linha(1)];
    estado.eventos = [{ lancamento_id: id(1), user_id: "dono", calendario_id: "agenda", evento_id: "1" }];
    estado.antesDeApagar = () => { estado.linhas[0].atualizado_em = "2026-11-16T12:01:00.000Z"; };
    expect(await excluirLoteConfirmado({ alcance: "todos" }, [id(1)], corte)).toEqual({ ok: true, excluidos: 0, ignorados: 1, avisoAgenda: false });
    expect(estado.linhas).toHaveLength(1);
    expect(estado.fila).toEqual([]);
  });

  it("interrompe antes de apagar se a leitura dos vínculos falhar", async () => {
    estado.linhas = [linha(1)]; estado.falha = "eventos_agenda:ler";
    expect((await excluirLoteConfirmado({ alcance: "todos" }, [id(1)], corte)).ok).toBe(false);
    expect(estado.linhas).toHaveLength(1);
    expect(estado.chamadas).not.toContain("lancamentos:apagar");
  });

  it("uma falha no DELETE preserva os dados e não manda apagar compromissos", async () => {
    estado.linhas = [linha(1)]; estado.falha = "lancamentos:apagar";
    estado.eventos = [{ lancamento_id: id(1), user_id: "dono", calendario_id: "agenda", evento_id: "1" }];
    expect((await excluirLoteConfirmado({ alcance: "todos" }, [id(1)], corte)).ok).toBe(false);
    expect(estado.linhas).toHaveLength(1);
    expect(estado.fila).toEqual([]);
  });

  it("informa falha na agenda sem dizer que os dados já apagados continuam salvos", async () => {
    estado.linhas = [linha(1)]; estado.falha = "fila_agenda:inserir";
    estado.eventos = [{ lancamento_id: id(1), user_id: "dono", calendario_id: "agenda", evento_id: "1" }];
    expect(await excluirLoteConfirmado({ alcance: "todos" }, [id(1)], corte)).toEqual({ ok: true, excluidos: 1, ignorados: 0, avisoAgenda: true });
    expect(estado.linhas).toEqual([]);
  });
});
