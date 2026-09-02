import { dataBr, moedaOuOculto } from "@/lib/formato";
import { calcularIndicadores, montarFatias } from "@/lib/relatorio";
import type { DadosRelatorio } from "@/lib/dados/relatorios";
import {
  dataQueVale,
  ROTULO_SITUACAO,
  type LancamentoNaLista,
} from "@/lib/tipos/lancamentos";
import type { Meta } from "@/lib/tipos/metas";
import { percentualDaMeta } from "@/lib/tipos/metas";
import { estadoDoOrcamento, percentualDoOrcamento, type Orcamento } from "@/lib/tipos/orcamentos";

/**
 * PDF do relatório, desenhado a partir dos DADOS.
 *
 * A versão anterior fotografava a tela: o PDF saía com o tema escuro do
 * aparelho, em imagens serrilhadas, pesadas e sem texto selecionável. Aqui
 * o documento é montado do zero — folha branca, texto de verdade, tabelas
 * que quebram de página. É o que se espera de um relatório impresso.
 */

const A4 = { largura: 210, altura: 297 };
const MARGEM = 16;
const UTIL = A4.largura - MARGEM * 2;

const TINTA = { r: 28, g: 30, b: 32 };
const CINZA = { r: 120, g: 124, b: 128 };
const LINHA = { r: 214, g: 214, b: 210 };
const VERDE = { r: 47, g: 107, b: 71 };
const VERMELHO = { r: 168, g: 58, b: 52 };

type Doc = import("jspdf").jsPDF;

/** Cursor vertical com quebra de página automática. */
class Folha {
  y = MARGEM;
  private paginas = 1;

  constructor(private doc: Doc) {}

  /** Garante espaço; abre página nova quando não cabe. */
  espaco(altura: number) {
    if (this.y + altura > A4.altura - MARGEM - 8) {
      this.doc.addPage();
      this.paginas++;
      this.y = MARGEM;
    }
  }

  pular(n: number) {
    this.y += n;
  }

  get totalPaginas() {
    return this.paginas;
  }
}

function tinta(doc: Doc, c: { r: number; g: number; b: number }) {
  doc.setTextColor(c.r, c.g, c.b);
}

function titulo(doc: Doc, f: Folha, numero: number, texto: string) {
  f.espaco(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  tinta(doc, TINTA);
  doc.text(`${numero}. ${texto}`, MARGEM, f.y);
  f.pular(2);
  doc.setDrawColor(LINHA.r, LINHA.g, LINHA.b);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, f.y, A4.largura - MARGEM, f.y);
  f.pular(6);
}

/** Rótulo pequeno em cima, valor embaixo — o par que se repete no resumo. */
function par(
  doc: Doc,
  x: number,
  y: number,
  rotulo: string,
  valor: string,
  cor = TINTA,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  tinta(doc, CINZA);
  doc.text(rotulo.toUpperCase(), x, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  tinta(doc, cor);
  doc.text(valor, x, y + 5);
}

type Coluna = { titulo: string; largura: number; alinhar?: "esquerda" | "direita" };

function tabela(
  doc: Doc,
  f: Folha,
  colunas: Coluna[],
  linhas: string[][],
  corDaLinha?: (i: number) => { r: number; g: number; b: number } | null,
  /** Desenho extra no início da linha — o quadradinho de cor da categoria. */
  enfeite?: (i: number, y: number) => void,
) {
  const cabecalho = () => {
    f.espaco(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    tinta(doc, CINZA);
    let x = MARGEM;
    for (const c of colunas) {
      const t = c.titulo.toUpperCase();
      if (c.alinhar === "direita") doc.text(t, x + c.largura, f.y, { align: "right" });
      else doc.text(t, x, f.y);
      x += c.largura;
    }
    f.pular(2);
    doc.setDrawColor(LINHA.r, LINHA.g, LINHA.b);
    doc.line(MARGEM, f.y, A4.largura - MARGEM, f.y);
    f.pular(4.5);
  };

  cabecalho();

  linhas.forEach((linha, i) => {
    const antes = f.y;
    f.espaco(6);
    // Quebrou a página: o cabeçalho volta, senão a tabela fica órfã.
    if (f.y < antes) cabecalho();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    enfeite?.(i, f.y);

    let x = MARGEM;
    colunas.forEach((c, j) => {
      const ultima = j === colunas.length - 1;
      tinta(doc, ultima && corDaLinha ? (corDaLinha(i) ?? TINTA) : TINTA);

      // Texto largo demais é cortado com reticências: quebrar em duas
      // linhas desalinharia a tabela inteira.
      let texto = linha[j] ?? "";
      const limite = c.largura - 2;
      if (doc.getTextWidth(texto) > limite) {
        while (texto.length > 1 && doc.getTextWidth(`${texto}…`) > limite) {
          texto = texto.slice(0, -1);
        }
        texto = `${texto}…`;
      }

      if (c.alinhar === "direita") doc.text(texto, x + c.largura, f.y, { align: "right" });
      else doc.text(texto, x, f.y);
      x += c.largura;
    });

    f.pular(5.5);
  });

  f.pular(4);
}

/** #RRGGBB para os três canais que o jsPDF espera. */
function hexParaRgb(hex: string): { r: number; g: number; b: number } {
  const limpo = hex.replace("#", "");
  const n = Number.parseInt(
    limpo.length === 3
      ? limpo.split("").map((c) => c + c).join("")
      : limpo,
    16,
  );
  return Number.isFinite(n)
    ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    : CINZA;
}

/**
 * Rosca desenhada em vetor, não colada como imagem.
 *
 * O jsPDF não tem arco preenchido, então cada fatia é um leque de
 * triângulos saindo do centro. Com um passo de 2 graus a borda fica lisa a
 * olho nu, e o arquivo continua leve e nítido em qualquer zoom.
 */
function rosca(
  doc: Doc,
  cx: number,
  cy: number,
  raio: number,
  fatias: { valor: number; cor: string }[],
) {
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  if (total <= 0) return;

  const VAO = 0.8; // graus de respiro entre fatias
  let angulo = -90; // começa no topo, como todo gráfico de pizza

  for (const f of fatias) {
    const tamanho = (f.valor / total) * 360;
    const fim = angulo + Math.max(tamanho - VAO, 0.4);
    const { r, g, b } = hexParaRgb(f.cor);
    doc.setFillColor(r, g, b);

    const passo = 2;
    for (let a = angulo; a < fim; a += passo) {
      const a2 = Math.min(a + passo, fim);
      const rad = (x: number) => (x * Math.PI) / 180;
      doc.triangle(
        cx,
        cy,
        cx + raio * Math.cos(rad(a)),
        cy + raio * Math.sin(rad(a)),
        cx + raio * Math.cos(rad(a2)),
        cy + raio * Math.sin(rad(a2)),
        "F",
      );
    }

    angulo += tamanho;
  }

  // O furo: círculo branco por cima do meio.
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, raio * 0.58, "F");
}

/** Barras de receitas contra despesas, também em vetor. */
function barras(
  doc: Doc,
  f: Folha,
  meses: { rotulo: string; receitas: number; despesas: number }[],
) {
  const maximo = Math.max(...meses.map((m) => Math.max(m.receitas, m.despesas)), 0);
  if (maximo <= 0) return;

  const ALTURA = 30;
  f.espaco(ALTURA + 14);

  const base = f.y + ALTURA;
  const larguraGrupo = UTIL / meses.length;
  const larguraBarra = Math.min(larguraGrupo / 3, 7);

  meses.forEach((m, i) => {
    const centro = MARGEM + larguraGrupo * i + larguraGrupo / 2;

    const desenhar = (valor: number, deslocamento: number, cor: typeof VERDE) => {
      const altura = (valor / maximo) * ALTURA;
      if (altura <= 0) return;
      doc.setFillColor(cor.r, cor.g, cor.b);
      doc.rect(centro + deslocamento, base - altura, larguraBarra, altura, "F");
    };

    desenhar(m.receitas, -larguraBarra - 0.6, VERDE);
    desenhar(m.despesas, 0.6, VERMELHO);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    tinta(doc, CINZA);
    doc.text(m.rotulo, centro, base + 4, { align: "center" });
  });

  // Linha da base, para as barras não flutuarem no vazio.
  doc.setDrawColor(LINHA.r, LINHA.g, LINHA.b);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, base, A4.largura - MARGEM, base);

  f.pular(ALTURA + 10);
}

/** Legenda de duas cores, para as barras não dependerem só da cor. */
function legendaBarras(doc: Doc, f: Folha) {
  f.espaco(6);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");

  doc.setFillColor(VERDE.r, VERDE.g, VERDE.b);
  doc.rect(MARGEM, f.y - 2, 3, 3, "F");
  tinta(doc, CINZA);
  doc.text("Receitas", MARGEM + 5, f.y);

  doc.setFillColor(VERMELHO.r, VERMELHO.g, VERMELHO.b);
  doc.rect(MARGEM + 26, f.y - 2, 3, 3, "F");
  doc.text("Despesas", MARGEM + 31, f.y);

  f.pular(6);
}

export type ConteudoRelatorio = {
  dados: DadosRelatorio;
  nome: string;
  de: string;
  ate: string;
  secoes: string[];
  ocultar: boolean;
  tecnicos: boolean;
  lancamentos: LancamentoNaLista[];
  orcamentos: Orcamento[];
  metas: Meta[];
};

export async function montarPdfRelatorio(c: ConteudoRelatorio): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const f = new Folha(doc);

  const v = (n: number) => moedaOuOculto(n, c.ocultar);
  const fatias = montarFatias(c.dados.despesasPorCategoria);
  const receitas = montarFatias(c.dados.receitasPorCategoria);
  const saldo = c.dados.totalReceitas - c.dados.totalDespesas;

  let n = 0;

  // ── Cabeçalho ────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  tinta(doc, TINTA);
  doc.text("Relatório financeiro", MARGEM, f.y + 4);
  f.pular(10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  tinta(doc, CINZA);
  doc.text(
    `${dataBr(c.de)} a ${dataBr(c.ate)} · ${c.dados.diasNoPeriodo} dias`,
    MARGEM,
    f.y,
  );
  f.pular(4.5);
  doc.text(
    `Emitido em ${dataBr(new Date())}${c.nome ? ` por ${c.nome}` : ""} · Ameixa`,
    MARGEM,
    f.y,
  );
  f.pular(4);

  doc.setDrawColor(LINHA.r, LINHA.g, LINHA.b);
  doc.setLineWidth(0.5);
  doc.line(MARGEM, f.y, A4.largura - MARGEM, f.y);
  f.pular(10);

  // ── Resumo ───────────────────────────────────────────────────
  if (c.secoes.includes("resumo")) {
    titulo(doc, f, ++n, "Resumo");

    const col = UTIL / 3;
    f.espaco(14);
    par(doc, MARGEM, f.y, "Receitas", v(c.dados.totalReceitas), VERDE);
    par(doc, MARGEM + col, f.y, "Despesas", v(c.dados.totalDespesas), VERMELHO);
    par(doc, MARGEM + col * 2, f.y, "Saldo", v(saldo), saldo < 0 ? VERMELHO : VERDE);
    f.pular(14);

    if (c.tecnicos) {
      const ind = calcularIndicadores(
        c.dados.despesasCruas,
        c.dados.diasNoPeriodo,
        c.dados.totalAnterior,
      );

      tabela(
        doc,
        f,
        [
          { titulo: "Indicador", largura: UTIL * 0.62 },
          { titulo: "Valor", largura: UTIL * 0.38, alinhar: "direita" },
        ],
        [
          ["Média diária de gasto", v(ind.mediaDiaria)],
          ["Ticket médio", v(ind.ticketMedio)],
          ["Maior despesa", v(ind.maiorDespesa)],
          ["Projeção mensal", v(ind.projecaoMensal)],
          [
            "Variação vs. período anterior",
            ind.variacao === null
              ? "sem base de comparação"
              : `${ind.variacao > 0 ? "+" : ""}${ind.variacao}%`,
          ],
          ["Participação do cartão", `${ind.participacaoCartao}%`],
          ["Dias sem gastar", String(ind.diasSemGastar)],
        ],
      );
    }
  }

  // ── Gastos por categoria ─────────────────────────────────────
  if (c.secoes.includes("categorias")) {
    titulo(doc, f, ++n, "Gastos por categoria");

    if (fatias.length === 0) {
      vazio(doc, f, "Nenhuma despesa no período.");
    } else {
      // Com "ocultar valores" o gráfico ainda faz sentido: as proporções
      // continuam verdadeiras, só os números somem.
      const RAIO = 26;
      f.espaco(RAIO * 2 + 10);
      rosca(doc, A4.largura / 2, f.y + RAIO, RAIO, fatias);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      tinta(doc, TINTA);
      doc.text(v(c.dados.totalDespesas), A4.largura / 2, f.y + RAIO + 1, {
        align: "center",
      });
      f.pular(RAIO * 2 + 8);

      tabela(
        doc,
        f,
        [
          { titulo: "", largura: 5 },
          { titulo: "Categoria", largura: UTIL * 0.44 },
          { titulo: "%", largura: UTIL * 0.16, alinhar: "direita" },
          { titulo: "Valor", largura: UTIL * 0.4 - 5, alinhar: "direita" },
        ],
        fatias.map((x) => ["", x.nome, `${x.percentual}%`, v(x.valor)]),
        () => VERMELHO,
        // Quadradinho da cor: a legenda não pode depender só do nome, nem
        // só da cor.
        (i, y) => {
          const { r, g, b } = hexParaRgb(fatias[i].cor);
          doc.setFillColor(r, g, b);
          doc.rect(MARGEM, y - 2.2, 2.6, 2.6, "F");
        },
      );
    }
  }

  // ── Evolução mensal ──────────────────────────────────────────
  if (c.secoes.includes("evolucao")) {
    titulo(doc, f, ++n, "Evolução mensal");

    legendaBarras(doc, f);
    barras(doc, f, c.dados.meses);

    tabela(
      doc,
      f,
      [
        { titulo: "Mês", largura: UTIL * 0.25 },
        { titulo: "Receitas", largura: UTIL * 0.25, alinhar: "direita" },
        { titulo: "Despesas", largura: UTIL * 0.25, alinhar: "direita" },
        { titulo: "Saldo", largura: UTIL * 0.25, alinhar: "direita" },
      ],
      c.dados.meses.map((m) => [
        m.rotulo,
        v(m.receitas),
        v(m.despesas),
        v(m.receitas - m.despesas),
      ]),
      (i) =>
        c.dados.meses[i].receitas - c.dados.meses[i].despesas < 0 ? VERMELHO : VERDE,
    );
  }

  // ── Origem das receitas ──────────────────────────────────────
  if (c.secoes.includes("receitas")) {
    titulo(doc, f, ++n, "Origem das receitas");

    if (receitas.length === 0) {
      vazio(doc, f, "Nenhuma receita no período.");
    } else {
      tabela(
        doc,
        f,
        [
          { titulo: "Categoria", largura: UTIL * 0.46 },
          { titulo: "%", largura: UTIL * 0.18, alinhar: "direita" },
          { titulo: "Valor", largura: UTIL * 0.36, alinhar: "direita" },
        ],
        receitas.map((x) => [x.nome, `${x.percentual}%`, v(x.valor)]),
        () => VERDE,
      );
    }
  }

  // ── Orçamentos ───────────────────────────────────────────────
  if (c.secoes.includes("orcamentos")) {
    titulo(doc, f, ++n, "Orçamentos");

    if (c.orcamentos.length === 0) {
      vazio(doc, f, "Nenhum orçamento definido.");
    } else {
      tabela(
        doc,
        f,
        [
          { titulo: "Categoria", largura: UTIL * 0.34 },
          { titulo: "Gasto", largura: UTIL * 0.22, alinhar: "direita" },
          { titulo: "Limite", largura: UTIL * 0.22, alinhar: "direita" },
          { titulo: "%", largura: UTIL * 0.22, alinhar: "direita" },
        ],
        c.orcamentos.map((o) => [
          o.categoria,
          v(o.gasto),
          v(o.limite),
          `${percentualDoOrcamento(o.gasto, o.limite)}%`,
        ]),
        (i) =>
          estadoDoOrcamento(c.orcamentos[i].gasto, c.orcamentos[i].limite) ===
          "ultrapassou"
            ? VERMELHO
            : VERDE,
      );
    }
  }

  // ── Metas ────────────────────────────────────────────────────
  if (c.secoes.includes("metas")) {
    titulo(doc, f, ++n, "Metas");

    if (c.metas.length === 0) {
      vazio(doc, f, "Nenhuma meta criada.");
    } else {
      tabela(
        doc,
        f,
        [
          { titulo: "Meta", largura: UTIL * 0.4 },
          { titulo: "Guardado", largura: UTIL * 0.24, alinhar: "direita" },
          { titulo: "Alvo", largura: UTIL * 0.24, alinhar: "direita" },
          { titulo: "%", largura: UTIL * 0.12, alinhar: "direita" },
        ],
        c.metas.map((m) => [
          m.nome,
          v(m.guardado),
          v(m.alvo),
          `${percentualDaMeta(m)}%`,
        ]),
      );
    }
  }

  // ── Lançamentos detalhados ───────────────────────────────────
  if (c.secoes.includes("detalhes")) {
    titulo(doc, f, ++n, "Lançamentos detalhados");

    if (c.lancamentos.length === 0) {
      vazio(doc, f, "Nenhum lançamento com as situações escolhidas.");
    } else {
      tabela(
        doc,
        f,
        [
          { titulo: "Vencimento", largura: UTIL * 0.135 },
          { titulo: "Descrição", largura: UTIL * 0.25 },
          { titulo: "Categoria", largura: UTIL * 0.18 },
          { titulo: "Subcategoria", largura: UTIL * 0.15 },
          { titulo: "Situação", largura: UTIL * 0.125 },
          { titulo: "Valor", largura: UTIL * 0.16, alinhar: "direita" },
        ],
        c.lancamentos.map((l) => [
          dataBr(dataQueVale(l)),
          l.descricao,
          l.categoria?.nome ?? "—",
          l.subcategoria?.nome ?? "—",
          ROTULO_SITUACAO[l.situacao],
          `${l.tipo === "receita" ? "+" : l.tipo === "aporte" ? "" : "−"}${v(l.valor)}`,
        ]),
        (i) =>
          c.lancamentos[i].tipo === "receita"
            ? VERDE
            : c.lancamentos[i].tipo === "aporte"
              ? CINZA
              : VERMELHO,
      );
    }
  }

  // ── Rodapé com numeração, em todas as páginas ────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    tinta(doc, CINZA);
    doc.text(
      `© ${new Date().getFullYear()} Rapha. Todos os direitos reservados.`,
      MARGEM,
      A4.altura - 8,
    );
    doc.text(`${p} de ${total}`, A4.largura - MARGEM, A4.altura - 8, {
      align: "right",
    });
  }

  return doc.output("blob");
}

function vazio(doc: Doc, f: Folha, texto: string) {
  f.espaco(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  tinta(doc, CINZA);
  doc.text(texto, MARGEM, f.y);
  f.pular(8);
}
