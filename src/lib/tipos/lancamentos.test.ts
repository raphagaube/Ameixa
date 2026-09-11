import { describe, expect, it } from "vitest";
import { dataQueVale, situacaoAlvo, trocarDiaDoMes } from "./lancamentos";

describe("situacaoAlvo", () => {
  it("quita despesa como paga e receita como recebida", () => {
    expect(situacaoAlvo("despesa", "quitado")).toBe("pago");
    expect(situacaoAlvo("receita", "quitado")).toBe("recebido");
  });

  it("devolve despesa e receita para o pendente certo", () => {
    expect(situacaoAlvo("despesa", "pendente")).toBe("a_pagar");
    expect(situacaoAlvo("receita", "pendente")).toBe("a_receber");
  });

  it("não toca em aporte de meta", () => {
    // Marcar aporte como recebido o transformaria em receita nos
    // relatórios — a regra inviolável número um.
    expect(situacaoAlvo("aporte", "quitado")).toBeNull();
    expect(situacaoAlvo("aporte", "pendente")).toBeNull();
  });
});

describe("dataQueVale decide o corte do lote", () => {
  // O caso que motivou tudo: vinte e uma parcelas de um processo,
  // registradas todas no mesmo dia, vencendo ao longo de dois anos.
  const parcela = (vencimento: string | null) => ({
    data_registro: "2026-05-28",
    data_vencimento: vencimento,
  });

  it("usa o vencimento quando existe", () => {
    expect(dataQueVale(parcela("2026-09-28"))).toBe("2026-09-28");
  });

  it("cai na data de registro quando não há vencimento", () => {
    expect(dataQueVale(parcela(null))).toBe("2026-05-28");
  });

  it("deixa de fora a parcela que vence depois do corte", () => {
    const corte = "2026-07-31";
    const serie = [
      parcela("2026-05-28"),
      parcela("2026-06-28"),
      parcela("2026-07-28"),
      parcela("2026-08-28"),
      parcela("2026-09-28"),
    ];
    const vencidas = serie.filter((p) => dataQueVale(p) <= corte);
    expect(vencidas).toHaveLength(3);
  });

  it("pelo registro, a mesma série entraria inteira — o erro que o corte evita", () => {
    const corte = "2026-07-31";
    const serie = [parcela("2026-08-28"), parcela("2027-01-28")];
    expect(serie.every((p) => p.data_registro <= corte)).toBe(true);
    expect(serie.filter((p) => dataQueVale(p) <= corte)).toHaveLength(0);
  });
});

describe("trocarDiaDoMes", () => {
  it("troca só o dia, mantendo mês e ano", () => {
    expect(trocarDiaDoMes("2026-10-11", 10)).toBe("2026-10-10");
    expect(trocarDiaDoMes("2027-01-03", 25)).toBe("2027-01-25");
  });

  it("dia maior que o mês vira o último dia, sem pular de mês", () => {
    expect(trocarDiaDoMes("2026-09-15", 31)).toBe("2026-09-30");
    expect(trocarDiaDoMes("2027-02-01", 30)).toBe("2027-02-28");
    expect(trocarDiaDoMes("2028-02-01", 30)).toBe("2028-02-29");
  });

  it("aceita data com hora colada", () => {
    expect(trocarDiaDoMes("2026-12-05T00:00:00", 9)).toBe("2026-12-09");
  });
});
