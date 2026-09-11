import { describe, expect, it } from "vitest";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";
import {
  agruparSeries,
  possiveisRepetidas,
  separarSufixo,
  trocarBase,
} from "./recorrentes";

let n = 0;
const l = (p: Partial<LancamentoNaLista>): LancamentoNaLista =>
  ({
    id: `id-${++n}`,
    tipo: "despesa",
    valor: 100,
    descricao: "Conta",
    data_registro: "2026-09-12",
    data_vencimento: null,
    situacao: "a_pagar",
    serie_id: null,
    categoria: null,
    subcategoria: null,
    conta: null,
    cartao: null,
    ...p,
  }) as LancamentoNaLista;

describe("separarSufixo", () => {
  it("reconhece as numerações que o app e a planilha produzem", () => {
    expect(separarSufixo("Candeias Ubatuba — 2/10")).toEqual({
      base: "Candeias Ubatuba",
      sufixo: " — 2/10",
    });
    expect(separarSufixo("Netflix — assinatura 3/12").base).toBe("Netflix");
    expect(separarSufixo("Processo Odair, o véio da NN (5/21)").base).toBe(
      "Processo Odair, o véio da NN",
    );
  });

  it("não come data que faz parte do nome", () => {
    expect(separarSufixo("Candeias Ubatuba 21 à 28/12").base).toBe(
      "Candeias Ubatuba 21 à 28/12",
    );
    expect(separarSufixo("Candeias Ubatuba 21 à 28/12 — 3/9").base).toBe(
      "Candeias Ubatuba 21 à 28/12",
    );
  });

  it("sem numeração, a descrição inteira é a base", () => {
    expect(separarSufixo("Dae")).toEqual({ base: "Dae", sufixo: "" });
  });
});

describe("trocarBase", () => {
  it("renomeia e mantém a numeração", () => {
    expect(trocarBase("Tânia Neuro — 2/4", "Tânia neuropsicopedagoga")).toBe(
      "Tânia neuropsicopedagoga — 2/4",
    );
    expect(trocarBase("Luz Cpfl", "Luz CPFL")).toBe("Luz CPFL");
  });
});

describe("agruparSeries", () => {
  it("agrupa pelo serie_id e ordena pelo vencimento", () => {
    const s = agruparSeries([
      l({ serie_id: "a", descricao: "Gfibra — 2/2", data_vencimento: "2026-11-10" }),
      l({ serie_id: "a", descricao: "Gfibra — 1/2", data_vencimento: "2026-10-10" }),
    ]);
    expect(s).toHaveLength(1);
    expect(s[0].base).toBe("Gfibra");
    expect(s[0].itens.map((i) => i.data_vencimento)).toEqual([
      "2026-10-10",
      "2026-11-10",
    ]);
  });

  it("sem serie_id, junta por nome e valor — e ignora avulsos", () => {
    const s = agruparSeries([
      l({ descricao: "Odair (5/21)", valor: 701.19, data_registro: "2026-09-28" }),
      l({ descricao: "Odair (6/21)", valor: 701.19, data_registro: "2026-10-28" }),
      l({ descricao: "C&A", valor: 500 }),
    ]);
    expect(s.map((x) => x.base)).toEqual(["Odair"]);
    expect(s[0].vinculada).toBe(false);
  });

  it("mesmo nome com valor diferente não vira a mesma série", () => {
    const s = agruparSeries([
      l({ descricao: "Farmácia", valor: 10 }),
      l({ descricao: "Farmácia", valor: 20 }),
    ]);
    expect(s).toHaveLength(0);
  });

  it("aporte nunca entra", () => {
    expect(
      agruparSeries([l({ tipo: "aporte", serie_id: "m", descricao: "Reserva" })]),
    ).toHaveLength(0);
  });
});

describe("possiveisRepetidas", () => {
  const serie = (id: string, nome: string, valor: number, meses: string[]) =>
    meses.map((m) =>
      l({ serie_id: id, descricao: nome, valor, data_vencimento: `${m}-10` }),
    );

  it("aponta a mesma conta cadastrada duas vezes", () => {
    const s = agruparSeries([
      ...serie("a", "Tânia neuropsipedagoga", 560, ["2026-09", "2026-10", "2026-11"]),
      ...serie("b", "Tânia Neuro", 560, ["2026-09", "2026-10", "2026-11"]),
    ]);
    const r = possiveisRepetidas(s);
    expect(r.get(s[0].chave)).toEqual([s[1].base]);
    expect(r.get(s[1].chave)).toEqual([s[0].base]);
  });

  it("valor diferente ou só um mês em comum não é repetida", () => {
    const s = agruparSeries([
      ...serie("a", "Escola", 2695.15, ["2026-10", "2026-11"]),
      ...serie("b", "Escola Cristã", 2453.87, ["2026-10", "2026-11"]),
      ...serie("c", "Obra", 1000, ["2026-10", "2026-11"]),
      ...serie("d", "Reforma", 1000, ["2026-11", "2026-12"]),
    ]);
    expect(possiveisRepetidas(s).size).toBe(0);
  });
});
