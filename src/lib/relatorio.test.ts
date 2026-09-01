import { describe, expect, it } from "vitest";
import {
  alturaDaBarra,
  calcularIndicadores,
  gradienteDaRosca,
  montarFatias,
} from "./relatorio";

const cor = "#8FB3D9";

describe("fatias da rosca", () => {
  it("ordena da maior para a menor", () => {
    const f = montarFatias([
      { nome: "A", valor: 10, cor },
      { nome: "B", valor: 50, cor },
      { nome: "C", valor: 30, cor },
    ]);
    expect(f.map((x) => x.nome)).toEqual(["B", "C", "A"]);
  });

  it("calcula percentual sobre o total", () => {
    const f = montarFatias([
      { nome: "A", valor: 25, cor },
      { nome: "B", valor: 75, cor },
    ]);
    expect(f[0].percentual).toBe(75);
    expect(f[1].percentual).toBe(25);
  });

  /**
   * Muitas fatias de cores parecidas viram um borrão — e as cores são
   * escolhidas pelo usuário, então não dá para garantir contraste.
   */
  it("agrupa as menores em Outras quando passa do máximo", () => {
    const itens = Array.from({ length: 10 }, (_, i) => ({
      nome: `C${i}`,
      valor: 10 - i,
      cor,
    }));
    const f = montarFatias(itens, 6);
    expect(f).toHaveLength(6);
    expect(f[5].nome).toBe("Outras (5)");
  });

  it("Outras soma exatamente o que sobrou", () => {
    const itens = [
      { nome: "A", valor: 100, cor },
      { nome: "B", valor: 10, cor },
      { nome: "C", valor: 5, cor },
      { nome: "D", valor: 3, cor },
    ];
    const f = montarFatias(itens, 2);
    expect(f[1].nome).toBe("Outras (3)");
    expect(f[1].valor).toBe(18);
  });

  it("os percentuais somam 100", () => {
    const f = montarFatias([
      { nome: "A", valor: 33, cor },
      { nome: "B", valor: 33, cor },
      { nome: "C", valor: 34, cor },
    ]);
    const soma = f.reduce((s, x) => s + x.percentual, 0);
    expect(Math.round(soma)).toBe(100);
  });

  it("ignora valores zerados e negativos", () => {
    const f = montarFatias([
      { nome: "A", valor: 10, cor },
      { nome: "B", valor: 0, cor },
      { nome: "C", valor: -5, cor },
    ]);
    expect(f).toHaveLength(1);
  });

  it("lista vazia devolve lista vazia, sem dividir por zero", () => {
    expect(montarFatias([])).toEqual([]);
  });
});

describe("gradiente da rosca", () => {
  it("sem dados, devolve o anel cinza", () => {
    expect(gradienteDaRosca([])).toContain("var(--ln2)");
  });

  it("com uma fatia só, preenche o círculo inteiro sem vão", () => {
    const g = gradienteDaRosca(montarFatias([{ nome: "A", valor: 10, cor }]));
    expect(g).toBe(`conic-gradient(${cor} 0deg 360deg)`);
  });

  it("deixa vão entre fatias, para separar cores parecidas", () => {
    const g = gradienteDaRosca(
      montarFatias([
        { nome: "A", valor: 50, cor: "#111111" },
        { nome: "B", valor: 50, cor: "#222222" },
      ]),
    );
    expect(g).toContain("transparent");
  });
});

describe("altura das barras", () => {
  it("o maior valor ocupa 100%", () => {
    expect(alturaDaBarra(500, 500)).toBe(100);
  });

  it("proporcional aos demais", () => {
    expect(alturaDaBarra(250, 500)).toBe(50);
  });

  it("valor zero não desenha barra", () => {
    expect(alturaDaBarra(0, 500)).toBe(0);
  });

  /** Um valor minúsculo ainda precisa aparecer, senão some do gráfico. */
  it("valor muito pequeno ainda desenha um traço", () => {
    expect(alturaDaBarra(1, 100000)).toBe(2);
  });

  it("máximo zero não quebra", () => {
    expect(alturaDaBarra(10, 0)).toBe(0);
  });
});

describe("indicadores técnicos", () => {
  const despesas = [
    { valor: 100, data: "2026-09-01", noCartao: true },
    { valor: 50, data: "2026-09-01", noCartao: false },
    { valor: 150, data: "2026-09-03", noCartao: true },
  ];

  it("média diária divide pelo período, não pelos dias com gasto", () => {
    expect(calcularIndicadores(despesas, 10, null).mediaDiaria).toBe(30);
  });

  it("ticket médio divide pela quantidade de lançamentos", () => {
    expect(calcularIndicadores(despesas, 10, null).ticketMedio).toBe(100);
  });

  it("acha a maior despesa", () => {
    expect(calcularIndicadores(despesas, 10, null).maiorDespesa).toBe(150);
  });

  it("participação do cartão em percentual", () => {
    expect(calcularIndicadores(despesas, 10, null).participacaoCartao).toBe(83);
  });

  it("dias sem gastar desconta os dias com lançamento", () => {
    expect(calcularIndicadores(despesas, 10, null).diasSemGastar).toBe(8);
  });

  it("variação compara com o período anterior", () => {
    expect(calcularIndicadores(despesas, 10, 200).variacao).toBe(50);
  });

  it("sem período anterior, não inventa variação", () => {
    expect(calcularIndicadores(despesas, 10, null).variacao).toBeNull();
    expect(calcularIndicadores(despesas, 10, 0).variacao).toBeNull();
  });

  it("sem despesas, tudo zero em vez de NaN", () => {
    const i = calcularIndicadores([], 30, null);
    expect(i.ticketMedio).toBe(0);
    expect(i.mediaDiaria).toBe(0);
    expect(i.participacaoCartao).toBe(0);
  });
});
