import { describe, expect, it } from "vitest";
import {
  casarNovas,
  periodoDaPlanilha,
  planejarAtualizacao,
  type AppAtual,
  type LancamentoAtual,
  type Nova,
} from "./atualizacao-ameixa";
import type { ListasPlanilha } from "./listas-planilha";
import { gerarPlanilhaAmeixa } from "./planilha-ameixa";
import { lerPlanilhaDoAmeixa } from "./planilha-ameixa-leitura";
import type { LancamentoNaLista } from "./tipos/lancamentos";

/** O app de mentira: três categorias, uma conta, três lançamentos. */
function montarApp(): AppAtual {
  const lancamentos: LancamentoAtual[] = [
    {
      id: "l-luz",
      tipo: "despesa",
      valor: 100,
      descricao: "Luz Cpfl",
      data_registro: "2026-09-12",
      data_vencimento: "2026-09-15",
      situacao: "a_pagar",
      categoria_id: "c-moradia",
      subcategoria_id: "s-luz",
      conta_id: "k-pag",
      forma_pagamento: "Pix",
      responsavel: null,
      observacao: null,
    },
    {
      id: "l-divida",
      tipo: "despesa",
      valor: 701.19,
      descricao: "Processo Odair (5/21)",
      data_registro: "2026-05-28",
      data_vencimento: "2026-09-28",
      situacao: "a_pagar",
      categoria_id: "c-dividas",
      subcategoria_id: null,
      conta_id: null,
      forma_pagamento: null,
      responsavel: "Rapha",
      observacao: "parcela do processo",
    },
    {
      id: "l-salario",
      tipo: "receita",
      valor: 16700,
      descricao: "Tecfusion",
      data_registro: "2026-08-17",
      data_vencimento: null,
      situacao: "recebido",
      categoria_id: "c-salario",
      subcategoria_id: null,
      conta_id: "k-pag",
      forma_pagamento: null,
      responsavel: null,
      observacao: null,
    },
  ];
  return {
    categorias: [
      { id: "c-moradia", nome: "Moradia", tipo: "despesa", subcategorias: [{ id: "s-luz", nome: "Luz" }] },
      { id: "c-dividas", nome: "DÍVIDAS & FINANCIAMENTOS", tipo: "despesa", subcategorias: [] },
      { id: "c-salario", nome: "Salário", tipo: "receita", subcategorias: [] },
    ],
    contas: [{ id: "k-pag", nome: "PAG BANK" }],
    lancamentos: new Map(lancamentos.map((l) => [l.id, l])),
  };
}

/** A planilha que o app exportaria desse estado. */
function exportar(app: AppAtual) {
  const nomeCat = (id: string | null) => app.categorias.find((c) => c.id === id)?.nome;
  const nomeSub = (id: string | null) =>
    app.categorias.flatMap((c) => c.subcategorias).find((s) => s.id === id)?.nome;
  const nomeConta = (id: string | null) => app.contas.find((c) => c.id === id)?.nome;

  const lista = [...app.lancamentos.values()].map(
    (l) =>
      ({
        ...l,
        categoria: nomeCat(l.categoria_id) ? { nome: nomeCat(l.categoria_id) } : null,
        subcategoria: nomeSub(l.subcategoria_id) ? { nome: nomeSub(l.subcategoria_id) } : null,
        conta: nomeConta(l.conta_id) ? { nome: nomeConta(l.conta_id) } : null,
        cartao: null,
      }) as unknown as LancamentoNaLista,
  );
  const listas: ListasPlanilha = {
    categorias: app.categorias,
    contas: app.contas,
    formas: ["Pix"],
  };
  return lerPlanilhaDoAmeixa(gerarPlanilhaAmeixa(lista, listas))!;
}

const linhaDe = (p: ReturnType<typeof exportar>, codigo: string) =>
  p.lancamentos.find((l) => l.codigo === codigo)!;

describe("planejarAtualizacao", () => {
  it("exportar e importar sem editar não muda nada", () => {
    const app = montarApp();
    const plano = planejarAtualizacao(exportar(app), app);
    expect(plano).toEqual({ renomes: [], mudancas: [], novas: [], problemas: [], semMudanca: 3 });
  });

  it("renomear só na aba Categorias não vira erro nas linhas com o nome antigo", () => {
    const app = montarApp();
    const p = exportar(app);
    p.categorias.find((c) => c.codigo === "c-dividas")!.categoria = "Dívidas e financiamentos";

    const plano = planejarAtualizacao(p, app);
    expect(plano.renomes).toEqual([
      { alvo: "categoria", id: "c-dividas", de: "DÍVIDAS & FINANCIAMENTOS", para: "Dívidas e financiamentos" },
    ]);
    expect(plano.mudancas).toEqual([]);
    expect(plano.problemas).toEqual([]);
  });

  it("renomear subcategoria e conta, com a linha já usando o nome novo", () => {
    const app = montarApp();
    const p = exportar(app);
    p.categorias.find((c) => c.codigo === "s-luz")!.subcategoria = "Energia";
    p.contas.find((c) => c.codigo === "k-pag")!.nome = "PagBank";
    linhaDe(p, "l-luz").cru["subcategoria"] = "Energia";
    linhaDe(p, "l-luz").cru["conta"] = "PagBank";

    const plano = planejarAtualizacao(p, app);
    expect(plano.renomes.map((r) => r.alvo).sort()).toEqual(["conta", "subcategoria"]);
    expect(plano.mudancas).toEqual([]);
    expect(plano.problemas).toEqual([]);
  });

  it("detecta só os campos que mudaram no lançamento", () => {
    const app = montarApp();
    const p = exportar(app);
    const l = linhaDe(p, "l-luz");
    l.cru["valor"] = "150";
    l.cru["vencimento"] = "20/09/2026";
    l.cru["situacao"] = "Pago";

    const [m] = planejarAtualizacao(p, app).mudancas;
    expect(m.id).toBe("l-luz");
    expect(m.campos).toEqual(["vencimento", "valor", "situação"]);
    expect(m.novos).toMatchObject({ valor: 150, data_vencimento: "2026-09-20", situacao: "pago" });
  });

  it("categoria que não existe é apontada e não apaga a categoria do lançamento", () => {
    const app = montarApp();
    const p = exportar(app);
    linhaDe(p, "l-luz").cru["categoria"] = "Inexistente";

    const plano = planejarAtualizacao(p, app);
    expect(plano.problemas).toHaveLength(1);
    expect(plano.problemas[0].motivo).toContain("Inexistente");
    expect(plano.mudancas).toEqual([]);
  });

  it("linha sem código é nova, já com os ids do app; código desconhecido é ignorado", () => {
    const app = montarApp();
    const p = exportar(app);
    p.lancamentos.push({ linha: 99, codigo: "", cru: { ...linhaDe(p, "l-luz").cru, codigo: "" } });
    p.lancamentos.push({ linha: 100, codigo: "nao-existe", cru: { ...linhaDe(p, "l-luz").cru, codigo: "nao-existe" } });

    const plano = planejarAtualizacao(p, app);
    expect(plano.novas).toHaveLength(1);
    expect(plano.novas[0]).toMatchObject({
      linha: 99,
      descricao: "Luz Cpfl",
      novos: {
        tipo: "despesa",
        valor: 100,
        data_registro: "2026-09-12",
        data_vencimento: "2026-09-15",
        situacao: "a_pagar",
        categoria_id: "c-moradia",
        subcategoria_id: "s-luz",
        conta_id: "k-pag",
      },
    });
    expect(plano.problemas.map((x) => x.linha)).toEqual([100]);
  });

  it("linha nova com categoria que não existe entra sem categoria, e o problema é apontado", () => {
    const app = montarApp();
    const p = exportar(app);
    p.lancamentos.push({
      linha: 50,
      codigo: "",
      cru: { ...linhaDe(p, "l-luz").cru, codigo: "", categoria: "Cartório", subcategoria: "" },
    });

    const plano = planejarAtualizacao(p, app);
    expect(plano.novas[0].novos).toMatchObject({ categoria_id: null, subcategoria_id: null });
    expect(plano.problemas[0].motivo).toContain("entra sem categoria");
  });

  it("linha em branco é ignorada; linha nova sem valor é apontada e não entra", () => {
    const app = montarApp();
    const p = exportar(app);
    const vazia = Object.fromEntries(Object.keys(linhaDe(p, "l-luz").cru).map((k) => [k, ""]));
    p.lancamentos.push({ linha: 60, codigo: "", cru: vazia });
    p.lancamentos.push({ linha: 61, codigo: "", cru: { ...linhaDe(p, "l-luz").cru, codigo: "", valor: "" } });

    const plano = planejarAtualizacao(p, app);
    expect(plano.novas).toEqual([]);
    expect(plano.problemas).toEqual([
      { aba: "Lançamentos", linha: 61, motivo: "Linha nova sem valor — não foi criada." },
    ]);
  });

  it("dois itens com o mesmo nome final: nenhum dos dois é renomeado", () => {
    const app = montarApp();
    const p = exportar(app);
    p.categorias.find((c) => c.codigo === "c-dividas")!.categoria = "Moradia";

    const plano = planejarAtualizacao(p, app);
    expect(plano.renomes).toEqual([]);
    expect(plano.problemas[0].motivo).toContain("já existe");
  });
});

describe("periodoDaPlanilha", () => {
  it("vai da primeira à última data das linhas com código", () => {
    expect(periodoDaPlanilha(exportar(montarApp()))).toEqual({ de: "2026-05-28", ate: "2026-09-12" });
  });

  it("linha nova não estica o período, e sem linha com código não há período", () => {
    const p = exportar(montarApp());
    p.lancamentos.push({
      linha: 9,
      codigo: "",
      cru: { ...linhaDe(p, "l-luz").cru, data: "01/01/2020", codigo: "" },
    });
    expect(periodoDaPlanilha(p)).toEqual({ de: "2026-05-28", ate: "2026-09-12" });
    expect(periodoDaPlanilha({ ...p, lancamentos: p.lancamentos.filter((l) => !l.codigo) })).toEqual({
      de: null,
      ate: null,
    });
  });
});

describe("casarNovas", () => {
  const nova = (descricao: string, valor = 6872, data = "2026-09-13"): Nova => ({
    linha: 11,
    descricao,
    novos: {
      tipo: "despesa",
      valor,
      descricao,
      data_registro: data,
      data_vencimento: null,
      situacao: "a_pagar",
      categoria_id: null,
      subcategoria_id: null,
      conta_id: null,
      forma_pagamento: null,
      responsavel: null,
      observacao: null,
    },
  });
  const noApp = (id: string, descricao: string, valor = 6872, data = "2026-09-13") => ({
    id,
    tipo: "despesa",
    valor,
    descricao,
    data_registro: data,
  });

  it("linha nova que ainda não está no app é criada", () => {
    const r = casarNovas([nova("TRANSFERÊNCIA DE ESCRITURA")], [noApp("x", "Outra coisa")], new Set());
    expect(r.aCriar).toHaveLength(1);
    expect(r.jaNoApp).toEqual([]);
  });

  it("aplicar a mesma planilha de novo não cria outra vez", () => {
    const r = casarNovas(
      [nova("TRANSFERÊNCIA DE ESCRITURA")],
      [noApp("x", " transferência de escritura ")],
      new Set(),
    );
    expect(r).toEqual({ aCriar: [], jaNoApp: ["x"] });
  });

  it("casa um para um e não usa lançamento que já tem a sua linha com código", () => {
    const r = casarNovas(
      [nova("Café", 5), nova("Café", 5)],
      [noApp("a", "Café", 5), noApp("b", "Café", 5)],
      new Set(["b"]),
    );
    expect(r.jaNoApp).toEqual(["a"]);
    expect(r.aCriar).toHaveLength(1);
  });

  it("valor ou data diferente não casa", () => {
    const r = casarNovas(
      [nova("Café", 5), nova("Café", 5, "2026-09-14")],
      [noApp("a", "Café", 6), noApp("b", "Café", 5, "2026-09-13")],
      new Set(),
    );
    expect(r.jaNoApp).toEqual(["b"]);
    expect(r.aCriar.map((n) => n.novos.data_registro)).toEqual(["2026-09-14"]);
  });
});
