import { describe, expect, it } from "vitest";
import {
  periodoDaPlanilha,
  planejarAtualizacao,
  type AppAtual,
  type LancamentoAtual,
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

  it("linha sem código é nova; código desconhecido é ignorado", () => {
    const app = montarApp();
    const p = exportar(app);
    p.lancamentos.push({ linha: 99, codigo: "", cru: { ...linhaDe(p, "l-luz").cru, codigo: "" } });
    p.lancamentos.push({ linha: 100, codigo: "nao-existe", cru: { ...linhaDe(p, "l-luz").cru, codigo: "nao-existe" } });

    const plano = planejarAtualizacao(p, app);
    expect(plano.novas).toHaveLength(1);
    expect(plano.problemas.map((x) => x.linha)).toEqual([100]);
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
