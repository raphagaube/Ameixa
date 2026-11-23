import { beforeEach, describe, expect, it, vi } from "vitest";
import { importarLancamentos } from "../ajustes/importar";
import { analisarAtualizacao, aplicarAtualizacao } from "./atualizar-ameixa";
import type { PlanilhaCompacta } from "@/lib/planilha-compacta";

const estado = vi.hoisted(() => ({
  lancamentos: [] as Record<string, unknown>[],
  excluirLote: vi.fn(),
}));

class Consulta {
  private linhas: Record<string, unknown>[];

  constructor(tabela: string) {
    this.linhas = tabela === "lancamentos" ? estado.lancamentos : [];
  }

  select() { return this; }
  order() { return this; }
  in(campo: string, valores: string[]) { return this.filtrar((l) => valores.includes(String(l[campo]))); }
  gte(campo: string, valor: string) { return this.filtrar((l) => String(l[campo]) >= valor); }
  lte(campo: string, valor: string) { return this.filtrar((l) => String(l[campo]) <= valor); }
  neq(campo: string, valor: string) { return this.filtrar((l) => l[campo] !== valor); }
  range(de: number, ate: number) { this.linhas = this.linhas.slice(de, ate + 1); return this; }

  insert(linhas: Record<string, unknown>[]) {
    estado.lancamentos.push(...linhas);
    this.linhas = linhas;
    return this;
  }

  private filtrar(predicado: (linha: Record<string, unknown>) => boolean) {
    this.linhas = this.linhas.filter(predicado);
    return this;
  }

  then<T>(resolver: (r: { data: Record<string, unknown>[]; error: null }) => T) {
    return Promise.resolve({ data: this.linhas, error: null }).then(resolver);
  }
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/agenda/sincronizar", () => ({ enfileirar: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({
  criarClienteServidor: async () => ({ from: (tabela: string) => new Consulta(tabela) }),
  usuarioAtual: async () => ({ id: "dono" }),
}));
vi.mock("@/app/(app)/ajustes/exclusao", () => ({ excluirLoteConfirmado: estado.excluirLote }));

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const lancamento = (n: number, data: string) => ({
  id: id(n), tipo: "despesa", situacao: "pago", valor: 10, descricao: `Lançamento ${n}`,
  data_registro: data, data_vencimento: null, categoria_id: null, subcategoria_id: null,
  conta_id: null, forma_pagamento: null, responsavel: null, observacao: null,
});

const primeiro = lancamento(1, "2026-09-01");
const ultimo = lancamento(2, "2026-09-30");
const planilha: PlanilhaCompacta = {
  colunas: ["data", "descricao", "valor", "tipo"],
  lancamentos: [primeiro, ultimo].map((l, i) => [i + 2, l.id, [l.data_registro, l.descricao, "10", "Despesa"]]),
  categorias: [],
  contas: [],
};

beforeEach(() => {
  estado.lancamentos = [primeiro, ultimo];
  estado.excluirLote.mockReset().mockResolvedValue({ ok: true, excluidos: 1, ignorados: 0, avisoAgenda: false });
});

describe("exclusões na atualização pela planilha", () => {
  it("preserva lançamento incluído depois de uma prévia sem exclusões", async () => {
    const previa = await analisarAtualizacao(planilha);
    if (!previa.ok) throw new Error(previa.erro);
    expect(previa.exclusoes).toMatchObject({ quantidade: 0, confirmacao: null });

    estado.lancamentos.push(lancamento(3, "2026-09-05"));
    expect(await aplicarAtualizacao(planilha, previa.exclusoes.confirmacao)).toMatchObject({ ok: true, excluidos: 0 });
    expect(estado.excluirLote).not.toHaveBeenCalled();
  });

  it("envia para exclusão apenas os registros confirmados na prévia", async () => {
    const confirmado = lancamento(3, "2026-09-05");
    estado.lancamentos.push(confirmado);
    const previa = await analisarAtualizacao(planilha);
    if (!previa.ok) throw new Error(previa.erro);
    const { confirmacao } = previa.exclusoes;
    expect(confirmacao).toMatchObject({ ids: [confirmado.id] });

    estado.lancamentos.push(lancamento(4, "2026-09-06"));
    expect(await aplicarAtualizacao(planilha, confirmacao)).toMatchObject({ ok: true, excluidos: 1 });
    expect(estado.excluirLote).toHaveBeenCalledExactlyOnceWith(
      { alcance: "periodo", de: "2026-09-01", ate: "2026-09-30" },
      [confirmado.id],
      confirmacao?.corte,
    );
  });
});

it("conta como pendências apenas os lançamentos importados depois de pular repetidos", async () => {
  const nova = { ...lancamento(3, "2026-09-05"), categoria_id: id(4) };

  expect(await importarLancamentos([primeiro, nova], "pular")).toEqual({
    ok: true, criados: 1, ignorados: 1, pendentes: 0,
  });
});
