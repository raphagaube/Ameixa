import { describe, expect, it } from "vitest";
import { casar, dataOfx, lerOfx, soNoApp, type LancamentoParaCasar } from "./ofx";

const ARQUIVO = `
OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260901120000[-3:BRT]
<TRNAMT>-218.40
<FITID>ABC123
<MEMO>MERCADO EXTRA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260902
<TRNAMT>5200.00
<FITID>DEF456
<NAME>SALARIO
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>
`;

describe("leitura do arquivo OFX", () => {
  it("lê os dois movimentos", () => {
    expect(lerOfx(ARQUIVO)).toHaveLength(2);
  });

  it("guarda o valor sempre positivo e marca a saída pelo sinal", () => {
    const [debito, credito] = lerOfx(ARQUIVO);
    expect(debito.valor).toBe(218.4);
    expect(debito.saida).toBe(true);
    expect(credito.valor).toBe(5200);
    expect(credito.saida).toBe(false);
  });

  it("ignora hora e fuso colados na data", () => {
    expect(lerOfx(ARQUIVO)[0].data).toBe("2026-09-01");
  });

  it("usa MEMO e, na falta dele, NAME", () => {
    const [d, c] = lerOfx(ARQUIVO);
    expect(d.descricao).toBe("MERCADO EXTRA");
    expect(c.descricao).toBe("SALARIO");
  });

  it("aceita vírgula decimal, que alguns bancos brasileiros mandam", () => {
    const m = lerOfx(
      "<STMTTRN><DTPOSTED>20260901<TRNAMT>-1234,56<FITID>X</STMTTRN>",
    );
    expect(m[0].valor).toBe(1234.56);
  });

  it("descarta movimento sem data ou sem valor", () => {
    expect(
      lerOfx("<STMTTRN><TRNAMT>-10<FITID>X</STMTTRN>"),
    ).toHaveLength(0);
    expect(
      lerOfx("<STMTTRN><DTPOSTED>20260901<FITID>X</STMTTRN>"),
    ).toHaveLength(0);
  });

  it("sem FITID, monta uma chave estável para não duplicar na reimportação", () => {
    const texto = "<STMTTRN><DTPOSTED>20260901<TRNAMT>-10<MEMO>PADARIA</STMTTRN>";
    expect(lerOfx(texto)[0].fitid).toBe(lerOfx(texto)[0].fitid);
    expect(lerOfx(texto)[0].fitid).toContain("PADARIA");
  });

  it("arquivo vazio devolve lista vazia", () => {
    expect(lerOfx("")).toEqual([]);
  });

  it("rejeita data malformada", () => {
    expect(dataOfx("2026")).toBeNull();
    expect(dataOfx("20261301")).toBeNull();
  });
});

describe("casamento com os lançamentos", () => {
  const movimentos = lerOfx(ARQUIVO);

  it("mesmo valor e mesma data é Confere", () => {
    const lancs: LancamentoParaCasar[] = [
      { id: "L1", valor: 218.4, data: "2026-09-01", descricao: "Mercado", fitid: null },
    ];
    const s = casar([movimentos[0]], lancs);
    expect(s[0].classificacao).toBe("confere");
    expect(s[0].lancamentoId).toBe("L1");
  });

  it("mesmo valor com até 3 dias de distância é Provável", () => {
    const lancs: LancamentoParaCasar[] = [
      { id: "L1", valor: 218.4, data: "2026-09-03", descricao: "Mercado", fitid: null },
    ];
    expect(casar([movimentos[0]], lancs)[0].classificacao).toBe("provavel");
  });

  it("mais de 3 dias já não casa", () => {
    const lancs: LancamentoParaCasar[] = [
      { id: "L1", valor: 218.4, data: "2026-09-06", descricao: "Mercado", fitid: null },
    ];
    expect(casar([movimentos[0]], lancs)[0].classificacao).toBe("novo");
  });

  it("sem correspondente é Novo no banco", () => {
    expect(casar([movimentos[0]], [])[0].classificacao).toBe("novo");
  });

  /** Regra 8: o fitid já gravado impede recriar qualquer coisa. */
  it("fitid já existente é Já conciliado", () => {
    const lancs: LancamentoParaCasar[] = [
      { id: "L1", valor: 218.4, data: "2026-09-01", descricao: "Mercado", fitid: "ABC123" },
    ];
    const s = casar([movimentos[0]], lancs);
    expect(s[0].classificacao).toBe("ja_conciliado");
    expect(s[0].lancamentoId).toBe("L1");
  });

  /**
   * Teste literal do modelo de dados: reimportar o mesmo OFX resulta em
   * zero lançamentos criados.
   */
  it("reimportar o mesmo arquivo não cria nada", () => {
    const lancs: LancamentoParaCasar[] = [
      { id: "L1", valor: 218.4, data: "2026-09-01", descricao: "Mercado", fitid: "ABC123" },
      { id: "L2", valor: 5200, data: "2026-09-02", descricao: "Salário", fitid: "DEF456" },
    ];
    const s = casar(movimentos, lancs);
    expect(s.every((x) => x.classificacao === "ja_conciliado")).toBe(true);
    expect(s.filter((x) => x.classificacao === "novo")).toHaveLength(0);
  });

  it("não reaproveita o mesmo lançamento em dois movimentos", () => {
    const dois = lerOfx(`
      <STMTTRN><DTPOSTED>20260901<TRNAMT>-50.00<FITID>A</STMTTRN>
      <STMTTRN><DTPOSTED>20260901<TRNAMT>-50.00<FITID>B</STMTTRN>
    `);
    const lancs: LancamentoParaCasar[] = [
      { id: "L1", valor: 50, data: "2026-09-01", descricao: "Café", fitid: null },
    ];
    const s = casar(dois, lancs);
    expect(s[0].lancamentoId).toBe("L1");
    expect(s[1].lancamentoId).toBeNull();
    expect(s[1].classificacao).toBe("novo");
  });

  it("prefere o lançamento de data mais próxima", () => {
    const lancs: LancamentoParaCasar[] = [
      { id: "longe", valor: 218.4, data: "2026-09-03", descricao: "x", fitid: null },
      { id: "perto", valor: 218.4, data: "2026-09-01", descricao: "x", fitid: null },
    ];
    expect(casar([movimentos[0]], lancs)[0].lancamentoId).toBe("perto");
  });
});

describe("bloco Só no app", () => {
  it("lista o que o extrato não trouxe", () => {
    const movimentos = lerOfx(ARQUIVO);
    const lancs: LancamentoParaCasar[] = [
      { id: "L1", valor: 218.4, data: "2026-09-01", descricao: "Mercado", fitid: null },
      { id: "L9", valor: 33, data: "2026-09-05", descricao: "Padaria", fitid: null },
    ];
    const s = casar(movimentos, lancs);
    const sobra = soNoApp(lancs, s);
    expect(sobra.map((l) => l.id)).toEqual(["L9"]);
  });
});
