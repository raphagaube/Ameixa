import { describe, expect, it } from "vitest";
import { MAX_OCORRENCIAS, gerarSerie, type BaseSerie } from "./serie";

const HOJE = "2026-09-01";

const base: BaseSerie = {
  tipo: "despesa",
  descricao: "Notebook",
  dataRegistro: "2026-09-01",
  dataVencimento: null,
  situacao: "pago",
};

describe("lançamento único", () => {
  it("gera uma ocorrência só, sem marca de série", () => {
    const r = gerarSerie(base, { repeticao: "unica" }, HOJE);
    expect(r).toHaveLength(1);
    expect(r[0].serie_tipo).toBeNull();
    expect(r[0].descricao).toBe("Notebook");
  });
});

describe("parcelada", () => {
  /** Caso literal do modelo de dados: 3/10 gera 8 lançamentos. */
  it("3/10 gera 8 parcelas", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 3, parcelaTotal: 10 },
      HOJE,
    );
    expect(r).toHaveLength(8);
  });

  it("numera de 3/10 até 10/10 na descrição", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 3, parcelaTotal: 10 },
      HOJE,
    );
    expect(r[0].descricao).toBe("Notebook — 3/10");
    expect(r[7].descricao).toBe("Notebook — 10/10");
    expect(r[7].parcela_atual).toBe(10);
    expect(r[7].parcela_total).toBe(10);
  });

  it("as parcelas futuras entram como a pagar", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 3, parcelaTotal: 10 },
      HOJE,
    );
    expect(r[0].situacao).toBe("pago");
    expect(r.slice(1).every((o) => o.situacao === "a_pagar")).toBe(true);
  });

  it("numa receita, as futuras entram como a receber", () => {
    const r = gerarSerie(
      { ...base, tipo: "receita", situacao: "recebido" },
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 3 },
      HOJE,
    );
    expect(r[1].situacao).toBe("a_receber");
  });

  it("avança de mês em mês", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 3 },
      HOJE,
    );
    expect(r.map((o) => o.data_registro)).toEqual([
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
    ]);
  });

  /** 31/01 + 1 mês tem que virar 28/02, não 03/03. */
  it("não escorrega para o mês seguinte quando o dia não existe", () => {
    const r = gerarSerie(
      { ...base, dataRegistro: "2026-01-31" },
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 3 },
      "2026-01-01",
    );
    expect(r.map((o) => o.data_registro)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("a última parcela sozinha ainda gera uma linha", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 10, parcelaTotal: 10 },
      HOJE,
    );
    expect(r).toHaveLength(1);
  });
});

describe("assinatura", () => {
  /** Caso literal do modelo de dados: 12 meses gera 12 cobranças numeradas. */
  it("12 meses gera 12 cobranças", () => {
    const r = gerarSerie(
      { ...base, descricao: "Netflix" },
      { repeticao: "assinatura", meses: 12 },
      HOJE,
    );
    expect(r).toHaveLength(12);
    expect(r[0].descricao).toBe("Netflix — assinatura 1/12");
    expect(r[11].descricao).toBe("Netflix — assinatura 12/12");
  });
});

describe("recorrente", () => {
  it("respeita a quantidade pedida", () => {
    const r = gerarSerie(
      base,
      { repeticao: "recorrente", frequencia: "mensal", ocorrencias: 6 },
      HOJE,
    );
    expect(r).toHaveLength(6);
  });

  it("semanal anda de 7 em 7 dias", () => {
    const r = gerarSerie(
      base,
      { repeticao: "recorrente", frequencia: "semanal", ocorrencias: 3 },
      HOJE,
    );
    expect(r.map((o) => o.data_registro)).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
    ]);
  });

  it("quinzenal anda de 14 em 14 dias", () => {
    const r = gerarSerie(
      base,
      { repeticao: "recorrente", frequencia: "quinzenal", ocorrencias: 2 },
      HOJE,
    );
    expect(r[1].data_registro).toBe("2026-09-15");
  });

  it("anual anda de 12 em 12 meses", () => {
    const r = gerarSerie(
      base,
      { repeticao: "recorrente", frequencia: "anual", ocorrencias: 2 },
      HOJE,
    );
    expect(r[1].data_registro).toBe("2027-09-01");
  });

  /** Caso literal do modelo de dados: personalizada respeita a data final. */
  it("personalizada para na data escolhida", () => {
    const r = gerarSerie(
      base,
      {
        repeticao: "recorrente",
        frequencia: "personalizado",
        ocorrencias: 0,
        ate: "2026-12-01",
      },
      HOJE,
    );
    expect(r).toHaveLength(4);
    expect(r[3].data_registro).toBe("2026-12-01");
  });

  /** Caso literal do modelo de dados: nunca passa de 240 ocorrências. */
  it("nunca passa de 240, mesmo com data final absurda", () => {
    const r = gerarSerie(
      base,
      {
        repeticao: "recorrente",
        frequencia: "personalizado",
        ocorrencias: 0,
        ate: "2200-01-01",
      },
      HOJE,
    );
    expect(r).toHaveLength(MAX_OCORRENCIAS);
  });

  it("nunca passa de 240 nem quando o usuário digita mais", () => {
    const r = gerarSerie(
      base,
      { repeticao: "recorrente", frequencia: "mensal", ocorrencias: 9999 },
      HOJE,
    );
    expect(r).toHaveLength(MAX_OCORRENCIAS);
  });

  it("data final no passado ainda salva o lançamento digitado", () => {
    const r = gerarSerie(
      base,
      {
        repeticao: "recorrente",
        frequencia: "personalizado",
        ocorrencias: 0,
        ate: "2020-01-01",
      },
      HOJE,
    );
    expect(r).toHaveLength(1);
  });
});

describe("vencimento", () => {
  it("mantém a distância entre registro e vencimento em toda a série", () => {
    const r = gerarSerie(
      { ...base, dataRegistro: "2026-09-01", dataVencimento: "2026-09-11" },
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 3 },
      HOJE,
    );
    expect(r[0].data_vencimento).toBe("2026-09-11");
    expect(r[1].data_vencimento).toBe("2026-10-11");
    expect(r[2].data_vencimento).toBe("2026-11-11");
  });

  it("sem vencimento, continua sem vencimento", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 2 },
      HOJE,
    );
    expect(r[1].data_vencimento).toBeNull();
  });
});
