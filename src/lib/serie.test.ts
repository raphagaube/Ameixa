import { describe, expect, it } from "vitest";
import { MAX_OCORRENCIAS, dataNoPasso, gerarSerie, type BaseSerie } from "./serie";


const base: BaseSerie = {
  tipo: "despesa",
  descricao: "Notebook",
  dataRegistro: "2026-09-01",
  dataVencimento: null,
  situacao: "pago",
};

describe("a data não substitui a situação informada", () => {
  for (const config of [
    { repeticao: "parcelada" as const, parcelaAtual: 1, parcelaTotal: 12 },
    { repeticao: "recorrente" as const, frequencia: "mensal" as const, ocorrencias: 12 },
    { repeticao: "assinatura" as const, meses: 12 },
  ]) {
    it(`${config.repeticao}: contas antigas a pagar continuam a pagar`, () => {
      const lista = gerarSerie({ ...base, dataRegistro: "2026-01-01", situacao: "a_pagar" }, config);
      expect(lista.every((l) => l.situacao === "a_pagar")).toBe(true);
    });
    it(`${config.repeticao}: receitas antigas a receber continuam a receber`, () => {
      const lista = gerarSerie({ ...base, tipo: "receita", dataRegistro: "2026-01-01", situacao: "a_receber" }, config);
      expect(lista.every((l) => l.situacao === "a_receber")).toBe(true);
    });
    it(`${config.repeticao}: pagamento antecipado continua pago em datas futuras`, () => {
      const lista = gerarSerie({ ...base, dataRegistro: "2027-01-01", situacao: "pago" }, config);
      expect(lista.every((l) => l.situacao === "pago")).toBe(true);
    });
  }
});

describe("lançamento único", () => {
  it("gera uma ocorrência só, sem marca de série", () => {
    const r = gerarSerie(base, { repeticao: "unica" });
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
    );
    expect(r).toHaveLength(8);
  });

  it("numera de 3/10 até 10/10 na descrição", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 3, parcelaTotal: 10 },
    );
    expect(r[0].descricao).toBe("Notebook — 3/10");
    expect(r[7].descricao).toBe("Notebook — 10/10");
    expect(r[7].parcela_atual).toBe(10);
    expect(r[7].parcela_total).toBe(10);
  });

  it("mantém a escolha de pago inclusive nas parcelas futuras", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 3, parcelaTotal: 10 },
    );
    expect(r[0].situacao).toBe("pago");
    expect(r.every((o) => o.situacao === "pago")).toBe(true);
  });

  it("mantém a escolha de recebido inclusive nas parcelas futuras", () => {
    const r = gerarSerie(
      { ...base, tipo: "receita", situacao: "recebido" },
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 3 },
    );
    expect(r.every((o) => o.situacao === "recebido")).toBe(true);
  });

  it("avança de mês em mês", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 3 },
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
    );
    expect(r).toHaveLength(6);
  });

  it("semanal anda de 7 em 7 dias", () => {
    const r = gerarSerie(
      base,
      { repeticao: "recorrente", frequencia: "semanal", ocorrencias: 3 },
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
    );
    expect(r[1].data_registro).toBe("2026-09-15");
  });

  it("anual anda de 12 em 12 meses", () => {
    const r = gerarSerie(
      base,
      { repeticao: "recorrente", frequencia: "anual", ocorrencias: 2 },
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
    );
    expect(r).toHaveLength(MAX_OCORRENCIAS);
  });

  it("nunca passa de 240 nem quando o usuário digita mais", () => {
    const r = gerarSerie(
      base,
      { repeticao: "recorrente", frequencia: "mensal", ocorrencias: 9999 },
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
    );
    expect(r).toHaveLength(1);
  });
});

describe("vencimento", () => {
  it("mantém a distância entre registro e vencimento em toda a série", () => {
    const r = gerarSerie(
      { ...base, dataRegistro: "2026-09-01", dataVencimento: "2026-09-11" },
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 3 },
    );
    expect(r[0].data_vencimento).toBe("2026-09-11");
    expect(r[1].data_vencimento).toBe("2026-10-11");
    expect(r[2].data_vencimento).toBe("2026-11-11");
  });

  it("sem vencimento, continua sem vencimento", () => {
    const r = gerarSerie(
      base,
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 2 },
    );
    expect(r[1].data_vencimento).toBeNull();
  });
});

describe("vencimento não escorrega com o tamanho do mês", () => {
  // O bug que motivou a correção: registrado dia 28, vencendo dia 10. Com
  // distância fixa em dias (13), a série vencia 10, 11, 10, 10, 11...
  const conta = {
    ...base,
    dataRegistro: "2026-05-28",
    dataVencimento: "2026-06-10",
  };

  it("parcelada mantém o dia 10 em todos os meses", () => {
    const r = gerarSerie(
      conta,
      { repeticao: "parcelada", parcelaAtual: 1, parcelaTotal: 8 },
    );
    expect(r.map((o) => o.data_vencimento!.slice(8))).toEqual(
      Array(8).fill("10"),
    );
    expect(r[1].data_vencimento).toBe("2026-07-10");
    expect(r[4].data_vencimento).toBe("2026-10-10");
  });

  it("recorrente mensal mantém o dia 10", () => {
    const r = gerarSerie(
      conta,
      { repeticao: "recorrente", frequencia: "mensal", ocorrencias: 12 },
    );
    expect(new Set(r.map((o) => o.data_vencimento!.slice(8)))).toEqual(
      new Set(["10"]),
    );
  });

  it("assinatura mantém o dia 10", () => {
    const r = gerarSerie(conta, { repeticao: "assinatura", meses: 6 });
    expect(r.every((o) => o.data_vencimento!.endsWith("-10"))).toBe(true);
  });

  it("vencimento dia 31 cai no último dia dos meses curtos, sem arrastar", () => {
    const r = gerarSerie(
      { ...base, dataRegistro: "2026-01-15", dataVencimento: "2026-01-31" },
      { repeticao: "recorrente", frequencia: "mensal", ocorrencias: 4 },
    );
    expect(r.map((o) => o.data_vencimento)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("semanal continua andando de 7 em 7 dias", () => {
    const r = gerarSerie(
      { ...base, dataRegistro: "2026-09-01", dataVencimento: "2026-09-03" },
      { repeticao: "recorrente", frequencia: "semanal", ocorrencias: 3 },
    );
    expect(r.map((o) => o.data_vencimento)).toEqual([
      "2026-09-03",
      "2026-09-10",
      "2026-09-17",
    ]);
  });
});

describe("dataNoPasso", () => {
  it("mensal mantém o dia e respeita o fim do mês sem arrastar", () => {
    expect(dataNoPasso("2026-10-10", 0)).toBe("2026-10-10");
    expect(dataNoPasso("2026-10-10", 3)).toBe("2027-01-10");
    expect(dataNoPasso("2026-01-31", 1)).toBe("2026-02-28");
    expect(dataNoPasso("2026-01-31", 2)).toBe("2026-03-31");
  });

  it("semanal e anual andam no passo certo", () => {
    expect(dataNoPasso("2026-09-03", 2, "semanal")).toBe("2026-09-17");
    expect(dataNoPasso("2026-09-03", 1, "anual")).toBe("2027-09-03");
  });
});
