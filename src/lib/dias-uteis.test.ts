import { describe, expect, it } from "vitest";
import {
  diaDePagamento,
  domingoDePascoa,
  ehDiaUtil,
  ehFeriado,
  ehFimDeSemana,
  motivoDaAntecipacao,
} from "./dias-uteis";

/** Datas conferidas contra o calendário civil brasileiro. */
describe("Páscoa", () => {
  const conhecidas: [number, string][] = [
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2028, "2028-04-16"],
  ];

  for (const [ano, esperado] of conhecidas) {
    it(`${ano} cai em ${esperado}`, () => {
      const d = domingoDePascoa(ano);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      expect(iso).toBe(esperado);
    });
  }
});

describe("feriados", () => {
  it("pega os fixos", () => {
    for (const d of [
      "2026-01-01",
      "2026-04-21",
      "2026-05-01",
      "2026-09-07",
      "2026-10-12",
      "2026-11-02",
      "2026-11-15",
      "2026-12-25",
    ]) {
      expect(ehFeriado(d), d).toBe(true);
    }
  });

  /** Os móveis são o motivo de a Páscoa ser calculada. */
  it("pega os móveis de 2026 (Páscoa em 05/04)", () => {
    expect(ehFeriado("2026-02-16"), "Carnaval segunda").toBe(true);
    expect(ehFeriado("2026-02-17"), "Carnaval terça").toBe(true);
    expect(ehFeriado("2026-04-03"), "Sexta-feira Santa").toBe(true);
    expect(ehFeriado("2026-06-04"), "Corpus Christi").toBe(true);
  });

  it("acompanha a Páscoa de outro ano", () => {
    // Páscoa 2027 em 28/03 → Sexta-feira Santa em 26/03.
    expect(ehFeriado("2027-03-26")).toBe(true);
    expect(ehFeriado("2026-03-26")).toBe(false);
  });

  it("dia comum não é feriado", () => {
    expect(ehFeriado("2026-09-10")).toBe(false);
  });
});

describe("fim de semana", () => {
  it("sábado e domingo", () => {
    expect(ehFimDeSemana("2026-09-05")).toBe(true); // sábado
    expect(ehFimDeSemana("2026-09-06")).toBe(true); // domingo
  });
  it("quinta não", () => {
    expect(ehFimDeSemana("2026-09-10")).toBe(false);
  });
});

describe("dia de pagamento", () => {
  it("dia útil fica onde está", () => {
    expect(diaDePagamento("2026-09-10")).toBe("2026-09-10");
  });

  it("sábado antecipa para sexta", () => {
    expect(diaDePagamento("2026-09-05")).toBe("2026-09-04");
  });

  it("domingo antecipa para sexta", () => {
    expect(diaDePagamento("2026-09-06")).toBe("2026-09-04");
  });

  it("feriado no meio da semana antecipa um dia", () => {
    // 07/09/2026 é segunda (Independência) → sexta 04/09.
    expect(diaDePagamento("2026-09-07")).toBe("2026-09-04");
  });

  /**
   * O caso que justifica o laço: Natal de 2026 é sexta, e 26 e 27 são fim
   * de semana. Vencer no domingo 27 tem que voltar até quinta 24.
   */
  it("atravessa feriado emendado com fim de semana", () => {
    expect(diaDePagamento("2026-12-27")).toBe("2026-12-24");
    expect(diaDePagamento("2026-12-25")).toBe("2026-12-24");
  });

  it("1º de janeiro volta para o último dia útil do ano anterior", () => {
    // 01/01/2027 é sexta-feira (feriado); 31/12/2026 é quinta.
    expect(diaDePagamento("2027-01-01")).toBe("2026-12-31");
  });

  /** Nunca empurra para frente: pagar depois custa juros. */
  it("só anda para trás", () => {
    for (const d of ["2026-09-05", "2026-09-06", "2026-12-25", "2027-01-01"]) {
      expect(diaDePagamento(d) <= d, d).toBe(true);
    }
  });
});

describe("motivo da antecipação", () => {
  it("explica fim de semana", () => {
    expect(motivoDaAntecipacao("2026-09-05")).toBe("fim de semana");
  });
  it("explica feriado", () => {
    expect(motivoDaAntecipacao("2026-09-07")).toBe("feriado");
  });
  it("dia útil não tem motivo", () => {
    expect(motivoDaAntecipacao("2026-09-10")).toBeNull();
    expect(ehDiaUtil("2026-09-10")).toBe(true);
  });
});
