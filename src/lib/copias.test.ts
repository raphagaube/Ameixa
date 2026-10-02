import { describe, expect, it } from "vitest";
import { acharCopias, type ParaCopias } from "./copias";

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
    expect(r.paraConferir).toEqual([{ manter: o1, iguais: [o2] }]);
  });

  it("dois iguais que nasceram juntos nunca são marcados sozinhos — dois cafés são dois gastos", () => {
    const a = lanc({ tipo: "despesa", valor: 5, descricao: "Café", criado_em: "2026-09-01T23:53:10Z" });
    const b = lanc({ tipo: "despesa", valor: 5, descricao: "Café", criado_em: "2026-09-01T23:53:12Z" });
    const r = acharCopias([a, b]);
    expect(r.copias).toEqual([]);
    expect(r.paraConferir).toEqual([{ manter: a, iguais: [b] }]);
  });

  it("igual lançado à mão depois não é cópia de importação: vai para conferir", () => {
    const original = lanc({});
    const naMao = lanc({ criado_em: LOTE_2, importado: false });
    const r = acharCopias([original, naMao]);
    expect(r.copias).toEqual([]);
    expect(r.paraConferir).toEqual([{ manter: original, iguais: [naMao] }]);
  });

  it("segunda importação com mais linhas que os originais: só casa um para um", () => {
    const original = lanc({});
    const c1 = lanc({ criado_em: LOTE_2 });
    const c2 = lanc({ criado_em: LOTE_2 });
    const r = acharCopias([original, c1, c2]);
    expect(r.copias).toHaveLength(1);
    expect(r.paraConferir).toEqual([{ manter: original, iguais: [c2] }]);
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
