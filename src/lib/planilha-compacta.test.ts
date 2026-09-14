import { describe, expect, it } from "vitest";
import { compactarPlanilha, expandirPlanilha } from "./planilha-compacta";
import type { PlanilhaDoAmeixa } from "./planilha-ameixa-leitura";

const linha = (i: number) => ({
  linha: i + 2,
  codigo: `codigo-${i}`,
  cru: {
    data: "2026-09-12",
    vencimento: "2026-09-15",
    descricao: `Luz Cpfl ${i}`,
    valor: "100.5",
    tipo: "Despesa",
    situacao: "A pagar",
    categoria: "Moradia",
    subcategoria: "Luz",
    conta: "PAG BANK",
    "forma de pagamento": "Pix",
    responsavel: "",
    observacao: "",
    codigo: `codigo-${i}`,
  },
});

const planilha: PlanilhaDoAmeixa = {
  lancamentos: Array.from({ length: 50 }, (_, i) => linha(i)),
  categorias: [{ linha: 2, codigo: "c1", tipo: "Despesa", categoria: "Moradia", subcategoria: "" }],
  contas: [{ linha: 2, codigo: "k1", nome: "PAG BANK" }],
};

describe("planilha compacta", () => {
  it("compactar e expandir devolve exatamente a mesma planilha", () => {
    expect(expandirPlanilha(compactarPlanilha(planilha))).toEqual(planilha);
  });

  it("fica bem menor que o formato com as colunas repetidas", () => {
    const cheio = JSON.stringify(planilha).length;
    const compacto = JSON.stringify(compactarPlanilha(planilha)).length;
    expect(compacto).toBeLessThan(cheio * 0.7);
  });
});
