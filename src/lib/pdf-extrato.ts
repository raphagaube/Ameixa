import {
  sinalDoTipo,
  totaisDoExtrato,
  type DatasPor,
} from "@/lib/extrato-impresso";
import { dataBr, hojeEmBrasilia, moedaOuOculto } from "@/lib/formato";
import {
  A4,
  CINZA,
  Folha,
  LINHA,
  MARGEM,
  TINTA,
  UTIL,
  VERDE,
  VERMELHO,
  par,
  rodape,
  tabela,
  tinta,
  vazio,
} from "@/lib/pdf-relatorio";
import { ROTULO_SITUACAO, type LancamentoNaLista } from "@/lib/tipos/lancamentos";

/**
 * PDF do extrato: a lista de lançamentos do período, com os filtros da tela.
 *
 * Usa as mesmas peças do relatório — folha branca, texto de verdade, tabela
 * que quebra de página com o cabeçalho de volta — para os dois documentos
 * terem a mesma cara.
 */

export type ConteudoExtrato = {
  nome: string;
  de: string;
  ate: string;
  datasPor: DatasPor;
  /** Os filtros ligados, já em palavras (ver `descreverFiltros`). */
  filtros: string[];
  ocultar: boolean;
  lancamentos: LancamentoNaLista[];
  /** A lista bateu no teto e pode haver mais lançamentos no período. */
  cortado: boolean;
};

export async function montarPdfExtrato(c: ConteudoExtrato): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const f = new Folha(doc);

  const v = (n: number) => moedaOuOculto(n, c.ocultar);
  const t = totaisDoExtrato(c.lancamentos);

  // ── Cabeçalho ────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  tinta(doc, TINTA);
  doc.text("Extrato", MARGEM, f.y + 4);
  f.pular(10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  tinta(doc, CINZA);
  doc.text(
    `${dataBr(c.de)} a ${dataBr(c.ate)} · ${
      c.datasPor === "vencimento" ? "pelo vencimento" : "pela data do registro"
    }`,
    MARGEM,
    f.y,
  );
  f.pular(4.5);
  if (c.filtros.length > 0) {
    // Muitos filtros não cabem numa linha; quebra em vez de sair da folha.
    const linhas = doc.splitTextToSize(`Filtros: ${c.filtros.join(", ")}.`, UTIL) as string[];
    for (const linha of linhas) {
      doc.text(linha, MARGEM, f.y);
      f.pular(4.5);
    }
  }
  doc.text(
    `Emitido em ${dataBr(hojeEmBrasilia())}${c.nome ? ` por ${c.nome}` : ""} · Ameixa`,
    MARGEM,
    f.y,
  );
  f.pular(4);

  doc.setDrawColor(LINHA.r, LINHA.g, LINHA.b);
  doc.setLineWidth(0.5);
  doc.line(MARGEM, f.y, A4.largura - MARGEM, f.y);
  f.pular(10);

  // ── Totais ───────────────────────────────────────────────────
  const col = UTIL / 4;
  par(doc, MARGEM, f.y, "Receitas", v(t.receitas), VERDE);
  par(doc, MARGEM + col, f.y, "Despesas", v(t.despesas), VERMELHO);
  par(
    doc,
    MARGEM + col * 2,
    f.y,
    "Saldo do período",
    `${t.saldo < 0 ? "−" : "+"}${v(Math.abs(t.saldo))}`,
    t.saldo < 0 ? VERMELHO : VERDE,
  );
  par(doc, MARGEM + col * 3, f.y, "Lançamentos", String(t.quantidade));
  f.pular(13);

  if (t.aportes > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    tinta(doc, CINZA);
    doc.text(
      t.aportes === 1
        ? "1 aporte em meta aparece na lista, mas não entra em receitas nem em despesas."
        : `${t.aportes} aportes em metas aparecem na lista, mas não entram em receitas nem em despesas.`,
      MARGEM,
      f.y,
    );
    f.pular(6);
  }
  f.pular(3);

  // ── Lançamentos ──────────────────────────────────────────────
  if (c.lancamentos.length === 0) {
    vazio(doc, f, "Nenhum lançamento neste período com esses filtros.");
  } else {
    tabela(
      doc,
      f,
      [
        { titulo: "Data", largura: UTIL * 0.11 },
        { titulo: "Vencimento", largura: UTIL * 0.12 },
        { titulo: "Descrição", largura: UTIL * 0.29 },
        { titulo: "Categoria", largura: UTIL * 0.2 },
        { titulo: "Situação", largura: UTIL * 0.12 },
        { titulo: "Valor", largura: UTIL * 0.16, alinhar: "direita" },
      ],
      c.lancamentos.map((l) => [
        dataBr(l.data_registro.slice(0, 10)),
        l.data_vencimento ? dataBr(l.data_vencimento.slice(0, 10)) : "—",
        l.descricao,
        l.categoria
          ? l.subcategoria
            ? `${l.categoria.nome} › ${l.subcategoria.nome}`
            : l.categoria.nome
          : "—",
        ROTULO_SITUACAO[l.situacao],
        `${sinalDoTipo(l.tipo)}${v(l.valor)}`,
      ]),
      (i) =>
        c.lancamentos[i].tipo === "receita"
          ? VERDE
          : c.lancamentos[i].tipo === "aporte"
            ? CINZA
            : VERMELHO,
    );
  }

  if (c.cortado) {
    vazio(
      doc,
      f,
      `A lista para nos primeiros ${c.lancamentos.length} lançamentos. Escolha um período menor para ver o resto.`,
    );
  }

  rodape(doc);
  return doc.output("blob");
}
