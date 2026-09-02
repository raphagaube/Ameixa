import { describe, expect, it } from "vitest";
import {
  agendaDe,
  assinatura,
  dataDoCompromisso,
  deveTerEvento,
  diaSeguinte,
  montarEvento,
  MINUTOS_DO_LEMBRETE,
} from "./evento";
import { moeda } from "@/lib/formato";
import type { LancamentoNaLista, Situacao } from "@/lib/tipos/lancamentos";

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
    categoria: { nome: "Casa", cor: "#8FB3D9", cor_texto: "#14161a" },
    subcategoria: { nome: "Luz" },
    conta: null,
    cartao: null,
    ...over,
  };
}

describe("quem merece evento", () => {
  const casos: [Situacao, boolean, boolean][] = [
    // situação, já tem evento, deve ter
    ["a_pagar", false, true],
    ["a_pagar", true, true],
    ["a_receber", false, true],
    ["a_receber", true, true],
    // Nasceu pago: nunca entra na agenda. Lembrete de conta já paga não
    // serve para nada.
    ["pago", false, false],
    ["recebido", false, false],
    // Já estava lá e foi quitado: o compromisso fica, como registro.
    ["pago", true, true],
    ["recebido", true, true],
    // Aporte em meta nunca vira compromisso.
    ["guardado", false, false],
    ["guardado", true, false],
  ];

  for (const [situacao, tem, esperado] of casos) {
    it(`${situacao}, ${tem ? "com" : "sem"} evento → ${esperado}`, () => {
      expect(deveTerEvento(situacao, tem)).toBe(esperado);
    });
  }
});

describe("data do compromisso", () => {
  it("usa o vencimento", () => {
    expect(dataDoCompromisso(lanc())).toBe("2026-09-10");
  });

  /** A coluna é nullable; sem o recuo metade dos a_pagar ficaria sem evento. */
  it("cai na data de registro quando não há vencimento", () => {
    // 05/09/2026 é sábado, então o compromisso antecipa para a sexta.
    expect(dataDoCompromisso(lanc({ data_vencimento: null }))).toBe("2026-09-04");
  });

  /**
   * A regra do dono: conta que vence em fim de semana ou feriado é paga no
   * dia útil anterior. O lembrete tem que cair quando dá para pagar, não
   * quando o banco está fechado.
   */
  it("vencimento no sábado vira compromisso na sexta", () => {
    expect(dataDoCompromisso(lanc({ data_vencimento: "2026-09-05" }))).toBe(
      "2026-09-04",
    );
  });

  it("vencimento no feriado antecipa", () => {
    // 07/09 (Independência) cai numa segunda em 2026.
    expect(dataDoCompromisso(lanc({ data_vencimento: "2026-09-07" }))).toBe(
      "2026-09-04",
    );
  });

  it("vencimento em dia útil fica onde está", () => {
    expect(dataDoCompromisso(lanc({ data_vencimento: "2026-09-10" }))).toBe(
      "2026-09-10",
    );
  });

  it("a descrição explica a antecipação, e só quando ela acontece", () => {
    const antecipado = montarEvento(lanc({ data_vencimento: "2026-09-05" }));
    expect(antecipado.description).toContain("Vence em 05/09/2026");
    expect(antecipado.description).toContain("fim de semana");

    const normal = montarEvento(lanc({ data_vencimento: "2026-09-10" }));
    expect(normal.description).not.toContain("Vence em");
  });

  it("o fim é o dia seguinte, porque é exclusivo", () => {
    expect(montarEvento(lanc()).end.date).toBe("2026-09-11");
  });

  it("vira o mês", () => expect(diaSeguinte("2026-09-30")).toBe("2026-10-01"));
  it("vira o ano", () => expect(diaSeguinte("2026-12-31")).toBe("2027-01-01"));
  it("respeita bissexto", () =>
    expect(diaSeguinte("2028-02-28")).toBe("2028-02-29"));
});

describe("lembrete", () => {
  /**
   * O Google conta os minutos a partir da meia-noite do dia do evento.
   * 1440 tocaria à meia-noite do dia anterior, com o dono dormindo.
   */
  it("toca às 9h do dia anterior, não à meia-noite", () => {
    expect(MINUTOS_DO_LEMBRETE).toBe(900);
    const e = montarEvento(lanc());
    expect(e.reminders.overrides).toEqual([{ method: "popup", minutes: 900 }]);
  });

  it("conta quitada não toca mais", () => {
    const e = montarEvento(lanc({ situacao: "pago" }));
    expect(e.reminders.overrides).toEqual([]);
    expect(e.reminders.useDefault).toBe(false);
  });
});

describe("título e descrição", () => {
  it("diz o que fazer e quanto", () => {
    expect(montarEvento(lanc()).summary).toBe(
      `Pagar ${moeda(363)} · Conta de luz`,
    );
  });

  it("receita fala em receber", () => {
    expect(
      montarEvento(lanc({ tipo: "receita", situacao: "a_receber" })).summary,
    ).toContain("Receber");
  });

  it("quitada muda o título e ganha cor", () => {
    const e = montarEvento(lanc({ situacao: "pago" }));
    expect(e.summary).toBe(`Pago · ${moeda(363)} · Conta de luz`);
    expect(e.colorId).toBeTruthy();
  });

  /** O pedido: com a categoria correta. */
  it("leva categoria e subcategoria", () => {
    expect(montarEvento(lanc()).description).toContain("Categoria: Casa › Luz");
  });

  it("sem subcategoria escreve só a categoria", () => {
    expect(
      montarEvento(lanc({ subcategoria: null })).description,
    ).toContain("Categoria: Casa\n");
  });

  it("sem categoria não escreve a linha", () => {
    expect(
      montarEvento(lanc({ categoria: null, subcategoria: null })).description,
    ).not.toContain("Categoria:");
  });

  it("mostra a parcela quando é série", () => {
    expect(
      montarEvento(lanc({ parcela_atual: 3, parcela_total: 12 })).description,
    ).toContain("Parcela 3 de 12");
  });
});

describe("armadilhas do PostgREST", () => {
  /** `numeric` chega como string. Já mordeu este projeto antes. */
  it("aceita valor em string", () => {
    const e = montarEvento(lanc({ valor: "363.00" as unknown as number }));
    expect(e.summary).toContain(moeda(363));
  });

  /** Relação chega como objeto OU array, conforme a consulta. */
  it("aceita relação em array", () => {
    const e = montarEvento(
      lanc({
        categoria: [
          { nome: "Casa", cor: "#000", cor_texto: "#fff" },
        ] as unknown as LancamentoNaLista["categoria"],
        subcategoria: [{ nome: "Luz" }] as unknown as LancamentoNaLista["subcategoria"],
      }),
    );
    expect(e.description).toContain("Categoria: Casa › Luz");
  });

  it("valor ilegível não derruba a montagem", () => {
    const e = montarEvento(lanc({ valor: "banana" as unknown as number }));
    expect(e.summary).toContain("R$");
  });
});

describe("qual agenda", () => {
  it("despesa vai para a de pagar", () =>
    expect(agendaDe(lanc())).toBe("pagar"));
  it("receita vai para a de receber", () =>
    expect(agendaDe(lanc({ tipo: "receita" }))).toBe("receber"));
});

describe("assinatura", () => {
  it("entradas iguais dão a mesma assinatura", () => {
    expect(assinatura(lanc())).toBe(assinatura(lanc()));
  });

  /** Editar o que não aparece no evento não pode custar uma requisição. */
  it("ignora o que não aparece no evento", () => {
    expect(assinatura(lanc({ responsavel: "Rapha" }))).toBe(assinatura(lanc()));
  });

  for (const [nome, mudanca] of [
    ["valor", { valor: 999 }],
    ["data", { data_vencimento: "2026-09-11" }],
    ["situação", { situacao: "pago" as Situacao }],
    ["descrição", { descricao: "Outra" }],
    ["categoria", { categoria: null, subcategoria: null }],
  ] as const) {
    it(`muda quando muda ${nome}`, () => {
      expect(assinatura(lanc(mudanca))).not.toBe(assinatura(lanc()));
    });
  }
});
