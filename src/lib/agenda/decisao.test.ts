import { describe, expect, it } from "vitest";
import { planejar, type Vinculo } from "./decisao";
import { assinatura } from "./evento";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

const ID_PAGAR = "cal-pagar@group.calendar.google.com";
const ID_RECEBER = "cal-receber@group.calendar.google.com";
const idDaAgenda = (a: "pagar" | "receber") =>
  a === "pagar" ? ID_PAGAR : ID_RECEBER;

function lanc(over: Partial<LancamentoNaLista> = {}): LancamentoNaLista {
  return {
    id: "abc-123",
    tipo: "despesa",
    valor: 363,
    descricao: "Conta de luz",
    data_registro: "2026-09-05",
    data_vencimento: "2026-09-10",
    situacao: "a_pagar",
    categoria_id: null,
    subcategoria_id: null,
    conta_id: null,
    cartao_id: null,
    forma_pagamento: null,
    responsavel: null,
    observacao: null,
    meta_id: null,
    serie_id: null,
    serie_tipo: null,
    parcela_atual: null,
    parcela_total: null,
    incompleto: false,
    categoria: null,
    subcategoria: null,
    conta: null,
    cartao: null,
    ...over,
  };
}

function vinculo(l: LancamentoNaLista, calendario = ID_PAGAR): Vinculo {
  return {
    calendario_id: calendario,
    evento_id: "evt-1",
    assinatura: assinatura(l),
  };
}

describe("planejar", () => {
  it("pendência nova cria o evento", () => {
    const p = planejar(lanc(), null, idDaAgenda);
    expect(p).toMatchObject({ acao: "criar", agenda: "pagar" });
  });

  it("receita a receber vai para a outra agenda", () => {
    const p = planejar(
      lanc({ tipo: "receita", situacao: "a_receber" }),
      null,
      idDaAgenda,
    );
    expect(p).toMatchObject({ acao: "criar", agenda: "receber" });
  });

  /** O pedido: ao marcar como paga, o evento fica — atualizado, não apagado. */
  it("marcar como paga atualiza o evento existente", () => {
    const antes = lanc();
    const p = planejar(lanc({ situacao: "pago" }), vinculo(antes), idDaAgenda);
    expect(p).toMatchObject({ acao: "atualizar", evento_id: "evt-1" });
  });

  it("nascida paga não cria nada", () => {
    expect(planejar(lanc({ situacao: "pago" }), null, idDaAgenda)).toEqual({
      acao: "nada",
    });
  });

  /**
   * O teste que impede queimar quota à toa: 600 pendências reorganizadas
   * sem mudar nada do que aparece no evento são 600 requisições poupadas.
   */
  it("assinatura igual não faz nada", () => {
    const l = lanc();
    expect(planejar(l, vinculo(l), idDaAgenda)).toEqual({ acao: "nada" });
  });

  it("mudar só o responsável não fala com o Google", () => {
    const l = lanc();
    const p = planejar(lanc({ responsavel: "Rapha" }), vinculo(l), idDaAgenda);
    expect(p).toEqual({ acao: "nada" });
  });

  it("despesa que vira receita muda de agenda", () => {
    const antes = lanc();
    const p = planejar(
      lanc({ tipo: "receita", situacao: "a_receber" }),
      vinculo(antes),
      idDaAgenda,
    );
    expect(p).toMatchObject({ acao: "mover", agenda: "receber", evento_id: "evt-1" });
  });

  it("lançamento excluído apaga o evento", () => {
    const p = planejar(null, vinculo(lanc()), idDaAgenda);
    expect(p).toMatchObject({
      acao: "apagar",
      calendario_id: ID_PAGAR,
      evento_id: "evt-1",
    });
  });

  it("excluído que nunca foi sincronizado não faz nada", () => {
    expect(planejar(null, null, idDaAgenda)).toEqual({ acao: "nada" });
  });

  /** Virou aporte em meta: sai da agenda. */
  it("deixar de merecer evento apaga o que existia", () => {
    const p = planejar(
      lanc({ tipo: "aporte", situacao: "guardado" }),
      vinculo(lanc()),
      idDaAgenda,
    );
    expect(p).toMatchObject({ acao: "apagar" });
  });

  it("não tenta mover quando a agenda de destino é desconhecida", () => {
    const antes = lanc();
    const p = planejar(
      lanc({ tipo: "receita", situacao: "a_receber" }),
      vinculo(antes),
      () => null,
    );
    expect(p).toMatchObject({ acao: "atualizar" });
  });
});
