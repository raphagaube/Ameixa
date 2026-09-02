import { describe, expect, it } from "vitest";
import { montarPdfRelatorio, type ConteudoRelatorio } from "./pdf-relatorio";
import type { DadosRelatorio } from "@/lib/dados/relatorios";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

const dados: DadosRelatorio = {
  despesasPorCategoria: [
    { nome: "Moradia", valor: 2400, cor: "#8FB3D9" },
    { nome: "Alimentação", valor: 1310.5, cor: "#E9A28E" },
    { nome: "Saúde", valor: 480.9, cor: "#8FCFC4" },
  ],
  receitasPorCategoria: [{ nome: "Salário", valor: 7200, cor: "#93C9A8" }],
  meses: [
    { mes: "2026-04-01", rotulo: "abr/26", receitas: 7200, despesas: 4100 },
    { mes: "2026-05-01", rotulo: "mai/26", receitas: 7200, despesas: 5300 },
    { mes: "2026-06-01", rotulo: "jun/26", receitas: 0, despesas: 2100 },
  ],
  totalDespesas: 4191.4,
  totalReceitas: 7200,
  despesasCruas: [
    { valor: 2400, data: "2026-09-05", noCartao: false },
    { valor: 1310.5, data: "2026-09-08", noCartao: true },
  ],
  totalAnterior: 3800,
  totalLancamentos: 2,
  diasNoPeriodo: 30,
};

function lanc(
  id: string,
  descricao: string,
  valor: number,
  categoria: string | null = null,
  subcategoria: string | null = null,
): LancamentoNaLista {
  return {
    id,
    tipo: "despesa",
    valor,
    descricao,
    data_registro: "2026-09-05",
    data_vencimento: null,
    situacao: "pago",
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
    categoria: categoria ? { nome: categoria, cor: "#8FB3D9", cor_texto: "#14161a" } : null,
    subcategoria: subcategoria ? { nome: subcategoria } : null,
    conta: null,
    cartao: null,
  };
}

const base: ConteudoRelatorio = {
  dados,
  nome: "Mimi",
  de: "2026-09-01",
  ate: "2026-09-30",
  secoes: ["resumo", "categorias", "evolucao", "receitas"],
  ocultar: false,
  tecnicos: true,
  lancamentos: [],
  orcamentos: [],
  metas: [],
};

/** Os primeiros bytes de todo PDF válido. */
async function assinatura(blob: Blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  return String.fromCharCode(...buf.slice(0, 5));
}

describe("PDF do relatório", () => {
  it("gera um arquivo PDF válido", async () => {
    const blob = await montarPdfRelatorio(base);
    expect(await assinatura(blob)).toBe("%PDF-");
    expect(blob.size).toBeGreaterThan(1000);
  });

  /**
   * A versão antiga colava fotos da tela e passava de um megabyte. Texto e
   * vetor pesam uma fração disso — e continuam nítidos em qualquer zoom.
   */
  it("fica leve, porque é texto e vetor em vez de imagem", async () => {
    const blob = await montarPdfRelatorio(base);
    expect(blob.size).toBeLessThan(200_000);
  });

  it("mais conteúdo gera um arquivo maior", async () => {
    const curto = await montarPdfRelatorio(base);
    const longo = await montarPdfRelatorio({
      ...base,
      secoes: [...base.secoes, "detalhes"],
      lancamentos: Array.from({ length: 120 }, (_, i) =>
        lanc(`l${i}`, `Lançamento número ${i}`, 10 + i),
      ),
    });
    expect(longo.size).toBeGreaterThan(curto.size);
  });

  it("não quebra sem nenhuma seção escolhida", async () => {
    const blob = await montarPdfRelatorio({ ...base, secoes: [] });
    expect(await assinatura(blob)).toBe("%PDF-");
  });

  it("não quebra com período totalmente vazio", async () => {
    const blob = await montarPdfRelatorio({
      ...base,
      dados: {
        ...dados,
        despesasPorCategoria: [],
        receitasPorCategoria: [],
        meses: [],
        totalDespesas: 0,
        totalReceitas: 0,
        despesasCruas: [],
        totalAnterior: null,
        totalLancamentos: 0,
      },
    });
    expect(await assinatura(blob)).toBe("%PDF-");
  });

  it("gera com os valores ocultos", async () => {
    const blob = await montarPdfRelatorio({ ...base, ocultar: true });
    expect(await assinatura(blob)).toBe("%PDF-");
  });

  it("gera sem os dados técnicos", async () => {
    const blob = await montarPdfRelatorio({ ...base, tecnicos: false });
    expect(await assinatura(blob)).toBe("%PDF-");
  });

  /** Cor de categoria inválida não pode derrubar a geração inteira. */
  it("aguenta cor de categoria estragada", async () => {
    const blob = await montarPdfRelatorio({
      ...base,
      dados: {
        ...dados,
        despesasPorCategoria: [{ nome: "X", valor: 10, cor: "banana" }],
      },
    });
    expect(await assinatura(blob)).toBe("%PDF-");
  });

  /** Pedido: o detalhado precisa mostrar categoria E subcategoria. */
  it("gera o detalhado com categoria e subcategoria", async () => {
    const blob = await montarPdfRelatorio({
      ...base,
      secoes: ["detalhes"],
      lancamentos: [
        lanc("1", "Kalimera Hortifruti", 83.63, "Alimentação", "Supermercado"),
        lanc("2", "Uber", 24.9, "Transporte", "Aplicativo"),
        lanc("3", "Sem classificação", 10),
      ],
    });
    expect(await assinatura(blob)).toBe("%PDF-");
    expect(blob.size).toBeGreaterThan(1000);
  });
});
