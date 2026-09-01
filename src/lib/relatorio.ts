/**
 * Preparo dos dados dos gráficos.
 *
 * A rosca do handoff usa as cores das categorias, que o usuário escolhe
 * livremente — não dá para garantir uma paleta validada. Duas defesas:
 * 1. as fatias pequenas viram "Outras", então são poucas fatias por vez;
 * 2. a legenda traz nome, valor e percentual de cada uma, então a identidade
 *    nunca depende só da cor (importante para daltônicos).
 */

export type Fatia = {
  nome: string;
  valor: number;
  cor: string;
  percentual: number;
};

export const MAX_FATIAS = 6;
export const COR_OUTRAS = "#8A8F94";

/**
 * Ordena por valor, mantém as maiores e junta o resto em "Outras".
 * Percentuais são do total, não do que sobrou.
 */
export function montarFatias(
  itens: { nome: string; valor: number; cor: string }[],
  maximo = MAX_FATIAS,
): Fatia[] {
  const positivos = itens.filter((i) => i.valor > 0);
  const total = positivos.reduce((s, i) => s + i.valor, 0);
  if (total <= 0) return [];

  const pct = (v: number) => Math.round((v / total) * 1000) / 10;
  const ordenados = [...positivos].sort((a, b) => b.valor - a.valor);

  if (ordenados.length <= maximo) {
    return ordenados.map((i) => ({ ...i, percentual: pct(i.valor) }));
  }

  const principais = ordenados.slice(0, maximo - 1);
  const resto = ordenados.slice(maximo - 1);
  const somaResto = resto.reduce((s, i) => s + i.valor, 0);

  return [
    ...principais.map((i) => ({ ...i, percentual: pct(i.valor) })),
    {
      nome: `Outras (${resto.length})`,
      valor: somaResto,
      cor: COR_OUTRAS,
      percentual: pct(somaResto),
    },
  ];
}

/**
 * Monta o conic-gradient da rosca com um vão de 2px entre as fatias — o vão
 * separa fatias de cores parecidas mesmo quando a cor não basta.
 */
export function gradienteDaRosca(fatias: Fatia[], vaoGraus = 1.2): string {
  if (fatias.length === 0) return "conic-gradient(var(--ln2) 0deg 360deg)";
  if (fatias.length === 1) {
    return `conic-gradient(${fatias[0].cor} 0deg 360deg)`;
  }

  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const partes: string[] = [];
  let anguloAtual = 0;

  for (const f of fatias) {
    const tamanho = (f.valor / total) * 360;
    const fim = anguloAtual + Math.max(tamanho - vaoGraus, 0.2);
    partes.push(`${f.cor} ${anguloAtual}deg ${fim}deg`);
    partes.push(`transparent ${fim}deg ${anguloAtual + tamanho}deg`);
    anguloAtual += tamanho;
  }

  return `conic-gradient(${partes.join(", ")})`;
}

export type MesMovimento = {
  mes: string;
  rotulo: string;
  receitas: number;
  despesas: number;
};

/** Altura da barra em porcentagem, com o maior valor do período como topo. */
export function alturaDaBarra(valor: number, maximo: number): number {
  if (maximo <= 0) return 0;
  return Math.max(Math.round((valor / maximo) * 100), valor > 0 ? 2 : 0);
}

export type Indicadores = {
  mediaDiaria: number;
  ticketMedio: number;
  maiorDespesa: number;
  variacao: number | null;
  projecaoMensal: number;
  participacaoCartao: number;
  diasSemGastar: number;
};

export function calcularIndicadores(
  despesas: { valor: number; data: string; noCartao: boolean }[],
  diasNoPeriodo: number,
  totalPeriodoAnterior: number | null,
): Indicadores {
  const total = despesas.reduce((s, d) => s + d.valor, 0);
  const dias = Math.max(diasNoPeriodo, 1);
  const noCartao = despesas.filter((d) => d.noCartao).reduce((s, d) => s + d.valor, 0);
  const diasComGasto = new Set(despesas.map((d) => d.data)).size;

  return {
    mediaDiaria: total / dias,
    ticketMedio: despesas.length > 0 ? total / despesas.length : 0,
    maiorDespesa: despesas.reduce((m, d) => Math.max(m, d.valor), 0),
    variacao:
      totalPeriodoAnterior && totalPeriodoAnterior > 0
        ? Math.round(((total - totalPeriodoAnterior) / totalPeriodoAnterior) * 100)
        : null,
    projecaoMensal: (total / dias) * 30,
    participacaoCartao: total > 0 ? Math.round((noCartao / total) * 100) : 0,
    diasSemGastar: Math.max(dias - diasComGasto, 0),
  };
}
