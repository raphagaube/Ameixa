import { describe, expect, it } from "vitest";
import { acharCopias, acharParecidos, type ParaCopias } from "./copias";

const LOTE_1 = "2026-09-01T23:53:10Z"; // primeira importação
const MANUAL = "2026-09-08T02:09:00Z"; // lançado à mão
const LOTE_2 = "2026-09-13T23:58:20Z"; // planilha do app importada de novo

let n = 0;
function lanc(parcial: Partial<ParaCopias>): ParaCopias {
  n += 1;
  return {
    id: `l${String(n).padStart(3, "0")}`,
    tipo: "receita",
    valor: 10000,
    descricao: "Tecfusion",
    data_registro: "2026-02-08",
    importado: true,
    criado_em: LOTE_1,
    ...parcial,
  };
}

describe("acharCopias", () => {
  it("o que foi importado de novo é cópia; o original fica", () => {
    const original = lanc({ criado_em: MANUAL, importado: false, data_registro: "2026-06-23", valor: 8738.65 });
    const copia = lanc({ criado_em: LOTE_2, data_registro: "2026-06-23", valor: 8738.65 });
    const r = acharCopias([copia, original]);
    expect(r.copias).toEqual([{ copia, original }]);
    expect(r.paraConferir).toEqual([]);
  });

  it("descrição igual a menos de maiúsculas e espaços ainda é a mesma", () => {
    const original = lanc({ descricao: "Tecfusion " });
    const copia = lanc({ descricao: "tecfusion", criado_em: LOTE_2 });
    expect(acharCopias([original, copia]).copias).toHaveLength(1);
  });

  it("dia, valor, descrição ou tipo diferente não é cópia", () => {
    const base = lanc({});
    const r = acharCopias([
      base,
      lanc({ criado_em: LOTE_2, data_registro: "2026-02-28" }),
      lanc({ criado_em: LOTE_2, valor: 9000 }),
      lanc({ criado_em: LOTE_2, descricao: "Salario Tecfusion" }),
      lanc({ criado_em: LOTE_2, tipo: "despesa" }),
    ]);
    expect(r).toEqual({ copias: [], paraConferir: [] });
  });

  /**
   * O caso de 08/02/2026: dois "Tecfusion R$ 10.000,00" iguais na primeira
   * importação e mais dois na segunda. Os dois da segunda são cópias; o
   * segundo da primeira nasceu junto com o original, e quem decide é o dono.
   */
  it("dois originais iguais e duas cópias: saem as cópias, e o par original vai para conferir", () => {
    const o1 = lanc({});
    const o2 = lanc({});
    const c1 = lanc({ criado_em: LOTE_2 });
    const c2 = lanc({ criado_em: LOTE_2 });
    const r = acharCopias([c2, o2, c1, o1]);
    expect(r.copias.map((c) => c.copia.id).sort()).toEqual([c1.id, c2.id]);
    expect(r.copias.map((c) => c.original.id).sort()).toEqual([o1.id, o2.id]);
    expect(r.paraConferir).toEqual([{ item: o2, manter: o1, difere: [] }]);
  });

  it("dois iguais que nasceram juntos nunca são marcados sozinhos — dois cafés são dois gastos", () => {
    const a = lanc({ tipo: "despesa", valor: 5, descricao: "Café", criado_em: "2026-09-01T23:53:10Z" });
    const b = lanc({ tipo: "despesa", valor: 5, descricao: "Café", criado_em: "2026-09-01T23:53:12Z" });
    const r = acharCopias([a, b]);
    expect(r.copias).toEqual([]);
    expect(r.paraConferir).toEqual([{ item: b, manter: a, difere: [] }]);
  });

  it("igual lançado à mão depois não é cópia de importação: vai para conferir", () => {
    const original = lanc({});
    const naMao = lanc({ criado_em: LOTE_2, importado: false });
    const r = acharCopias([original, naMao]);
    expect(r.copias).toEqual([]);
    expect(r.paraConferir).toEqual([{ item: naMao, manter: original, difere: [] }]);
  });

  it("segunda importação com mais linhas que os originais: só casa um para um", () => {
    const original = lanc({});
    const c1 = lanc({ criado_em: LOTE_2 });
    const c2 = lanc({ criado_em: LOTE_2 });
    const r = acharCopias([original, c1, c2]);
    expect(r.copias).toHaveLength(1);
    expect(r.paraConferir).toEqual([{ item: c2, manter: original, difere: [] }]);
  });

  it("planilha importada duas vezes: as cópias dos dois lotes saem", () => {
    const original = lanc({});
    const c1 = lanc({ criado_em: LOTE_2 });
    const c2 = lanc({ criado_em: "2026-09-20T12:00:00Z" });
    const r = acharCopias([original, c1, c2]);
    expect(r.copias.map((c) => c.copia.id)).toEqual([c1.id, c2.id]);
    expect(r.copias.every((c) => c.original.id === original.id)).toBe(true);
  });

  it("aporte em meta fica de fora", () => {
    const a = lanc({ tipo: "aporte" });
    const b = lanc({ tipo: "aporte", criado_em: LOTE_2 });
    expect(acharCopias([a, b])).toEqual({ copias: [], paraConferir: [] });
  });

  it("um original nunca aparece como cópia", () => {
    const originais = Array.from({ length: 50 }, (_, i) => lanc({ valor: 100 + i }));
    const copias = originais.map((o) => lanc({ valor: o.valor, criado_em: LOTE_2 }));
    const r = acharCopias([...copias, ...originais]);
    const idsDasCopias = new Set(r.copias.map((c) => c.copia.id));
    expect(idsDasCopias.size).toBe(50);
    expect(originais.some((o) => idsDasCopias.has(o.id))).toBe(false);
  });
});

describe("pares que deixaram de ser idênticos", () => {
  const conta = (parcial: Partial<ParaCopias>, detalhes: Record<string, string | null>) =>
    lanc({ tipo: "despesa", valor: 706, descricao: "Sindy escritório (9/12)", detalhes, ...parcial });

  /**
   * Depois da importação o dono marcou a cópia como paga. Se ela saísse
   * sozinha, ficaria no app o original, ainda "a pagar": a correção perdida.
   */
  it("cópia editada depois não sai sozinha, e a tela sabe em quê ela difere", () => {
    const original = conta({}, { situação: "a_pagar", vencimento: "2026-10-12", categoria: "c1" });
    const editada = conta({ criado_em: LOTE_2 }, { situação: "pago", vencimento: "2026-10-12", categoria: "c1" });
    const r = acharCopias([original, editada]);
    expect(r.copias).toEqual([]);
    expect(r.paraConferir).toEqual([{ item: editada, manter: original, difere: ["situação"] }]);
  });

  it("idêntica em todos os detalhes continua saindo sozinha", () => {
    const d = { situação: "a_pagar", vencimento: "2026-10-12", categoria: "c1", conta: null };
    const original = conta({}, d);
    const copia = conta({ criado_em: LOTE_2 }, { ...d });
    expect(acharCopias([original, copia]).copias).toEqual([{ copia, original }]);
  });

  it("com dois originais diferentes, cada cópia casa com o original igual a ela", () => {
    const pago = conta({}, { situação: "pago" });
    const aPagar = conta({}, { situação: "a_pagar" });
    const copiaAPagar = conta({ criado_em: LOTE_2 }, { situação: "a_pagar" });
    const copiaPago = conta({ criado_em: LOTE_2 }, { situação: "pago" });
    const r = acharCopias([pago, aPagar, copiaAPagar, copiaPago]);
    expect(r.copias).toHaveLength(2);
    for (const c of r.copias) expect(c.copia.detalhes).toEqual(c.original.detalhes);
  });

  it("aponta todos os detalhes diferentes, inclusive vazio contra preenchido", () => {
    const original = conta({}, { situação: "a_pagar", vencimento: null, conta: "k1" });
    const outra = conta({ criado_em: LOTE_2 }, { situação: "a_pagar", vencimento: "2026-10-12", conta: null });
    expect(acharCopias([original, outra]).paraConferir[0].difere).toEqual(["vencimento", "conta"]);
  });
});

describe("acharParecidos", () => {
  const conta = (descricao: string, vencimento: string | null, parcial: Partial<ParaCopias> = {}) =>
    lanc({
      tipo: "despesa",
      valor: 566.1,
      descricao,
      data_registro: "2026-07-12",
      data_vencimento: vencimento,
      ...parcial,
    });

  /**
   * É assim que o dono repete conta recorrente: mesmo nome, mesmo valor, e
   * só o vencimento muda. São meses diferentes, não repetição.
   */
  it("mesmo nome e valor com vencimentos diferentes não é repetição", () => {
    const r = acharParecidos([
      conta("Escola Cristã Eloah", "2026-10-03"),
      conta("Escola Cristã Eloah", "2026-11-03"),
      conta("Escola Cristã Eloah", "2026-12-03"),
    ]);
    expect(r).toEqual([]);
  });

  it("mesmo vencimento, mesmo valor e mesmo nome: grupo de nome igual", () => {
    const a = conta("Kalunga Fortex", "2026-10-15");
    const b = conta("kalunga fortex ", "2026-10-15");
    const [g] = acharParecidos([a, b]);
    expect(g).toMatchObject({ classe: "igual", data: "2026-10-15", peloVencimento: true, valor: 566.1 });
    expect(g.itens.map((l) => l.id).sort()).toEqual([a.id, b.id].sort());
  });

  /** A mesma parcela em duas séries: uma numerada, a outra não. */
  it("a mesma conta em duas séries, uma com numeração e a outra sem, é nome parecido", () => {
    const [g] = acharParecidos([
      conta("Candeias Ubatuba", "2026-10-10"),
      conta("Candeias Ubatuba — 3/10", "2026-10-10", { data_registro: "2026-10-04" }),
    ]);
    expect(g.classe).toBe("parecido");
    expect(g.itens).toHaveLength(2);
  });

  it("nome abreviado ainda é parecido", () => {
    const [g] = acharParecidos([
      conta("Faculdade Rapha", "2026-10-03"),
      conta("Facu Rapha", "2026-10-03"),
    ]);
    expect(g.classe).toBe("parecido");
  });

  it("parcelas de números diferentes da mesma compra nunca se juntam", () => {
    const r = acharParecidos([
      conta("Guarda da Rua (1/9)", null, { data_registro: "2026-04-09" }),
      conta("Guarda da Rua (2/9)", null, { data_registro: "2026-04-09" }),
      conta("Guarda da Rua (3/9)", null, { data_registro: "2026-04-09" }),
    ]);
    expect(r).toEqual([]);
  });

  it("a mesma parcela repetida se junta", () => {
    const [g] = acharParecidos([
      conta("Sindy escritório (9/12)", "2026-10-12"),
      conta("Sindy escritório (9/12)", "2026-10-12"),
    ]);
    expect(g.classe).toBe("igual");
  });

  it("nomes sem nada em comum ficam por último, como 'diferente'", () => {
    const r = acharParecidos([
      conta("Anhanguera", "2026-10-03", { valor: 947.91 }),
      conta("Facu Rapha", "2026-10-03", { valor: 947.91 }),
      conta("Kalunga", "2026-10-15"),
      conta("Kalunga", "2026-10-15"),
    ]);
    expect(r.map((g) => g.classe)).toEqual(["igual", "diferente"]);
    expect(r[1].itens.map((l) => l.descricao).sort()).toEqual(["Anhanguera", "Facu Rapha"]);
  });

  it("sem vencimento, vale a data do registro", () => {
    const [g] = acharParecidos([
      conta("Gasolina", null, { valor: 150, data_registro: "2026-06-22" }),
      conta("Gasolina", null, { valor: 150, data_registro: "2026-06-22" }),
    ]);
    expect(g).toMatchObject({ classe: "igual", data: "2026-06-22", peloVencimento: false });
  });

  it("valor diferente, tipo diferente ou cópia já apontada ficam de fora", () => {
    const a = conta("Kalunga", "2026-10-15");
    const copia = conta("Kalunga", "2026-10-15");
    expect(
      acharParecidos(
        [a, copia, conta("Kalunga", "2026-10-15", { valor: 10 }), conta("Kalunga", "2026-10-15", { tipo: "receita" })],
        new Set([copia.id]),
      ),
    ).toEqual([]);
  });
});
