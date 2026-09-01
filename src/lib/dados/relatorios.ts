import "server-only";
import { nomeMes, paraIso } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { MesMovimento } from "@/lib/relatorio";

export type LinhaCategoria = { nome: string; valor: number; cor: string };

export type DadosRelatorio = {
  despesasPorCategoria: LinhaCategoria[];
  receitasPorCategoria: LinhaCategoria[];
  meses: MesMovimento[];
  totalDespesas: number;
  totalReceitas: number;
  despesasCruas: { valor: number; data: string; noCartao: boolean }[];
  totalAnterior: number | null;
  diasNoPeriodo: number;
};

function agrupar(
  linhas: {
    valor: number;
    categoria: { nome: string; cor: string } | null;
  }[],
): LinhaCategoria[] {
  const mapa = new Map<string, LinhaCategoria>();
  for (const l of linhas) {
    const nome = l.categoria?.nome ?? "Sem categoria";
    const cor = l.categoria?.cor ?? "#8A8F94";
    const atual = mapa.get(nome);
    if (atual) atual.valor += l.valor;
    else mapa.set(nome, { nome, cor, valor: l.valor });
  }
  return [...mapa.values()];
}

function umDia(ms: number) {
  return Math.max(Math.round(ms / 86400000) + 1, 1);
}

/**
 * Tudo que os relatórios precisam, para um intervalo de datas concreto.
 *
 * Armadilha nº 6 do handoff: o período precisa ser um intervalo de datas de
 * verdade, não um rótulo como "este mês" — senão o cálculo do período
 * anterior fica impossível.
 */
export async function dadosDoRelatorio(
  de: string,
  ate: string,
): Promise<DadosRelatorio> {
  const supabase = await criarClienteServidor();

  const seleção = "tipo, valor, data_registro, cartao_id, categoria:categorias(nome, cor)";

  const { data } = await supabase
    .from("lancamentos")
    .select(seleção)
    .gte("data_registro", de)
    .lte("data_registro", ate);

  type Bruto = {
    tipo: string;
    valor: string | number;
    data_registro: string;
    cartao_id: string | null;
    categoria: { nome: string; cor: string } | { nome: string; cor: string }[] | null;
  };

  const linhas = ((data ?? []) as Bruto[]).map((l) => ({
    tipo: l.tipo,
    valor: Number(l.valor),
    data: l.data_registro,
    noCartao: !!l.cartao_id,
    categoria: Array.isArray(l.categoria) ? (l.categoria[0] ?? null) : l.categoria,
  }));

  // Aportes ficam de fora de tudo: o dinheiro só mudou de lugar.
  const despesas = linhas.filter((l) => l.tipo === "despesa");
  const receitas = linhas.filter((l) => l.tipo === "receita");

  // Mesma duração, imediatamente antes — é o que dá sentido à variação.
  const inicio = new Date(de);
  const fim = new Date(ate);
  const duracaoMs = fim.getTime() - inicio.getTime();
  const anteriorFim = new Date(inicio.getTime() - 86400000);
  const anteriorInicio = new Date(anteriorFim.getTime() - duracaoMs);

  const { data: antes } = await supabase
    .from("lancamentos")
    .select("valor")
    .eq("tipo", "despesa")
    .gte("data_registro", paraIso(anteriorInicio))
    .lte("data_registro", paraIso(anteriorFim));

  const totalAnterior = antes?.length
    ? antes.reduce((s, a) => s + Number(a.valor), 0)
    : null;

  // Evolução dos últimos 6 meses contados a partir do fim do período.
  const meses: MesMovimento[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(fim.getFullYear(), fim.getMonth() - i, 1);
    const mDe = paraIso(ref);
    const mAte = paraIso(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));

    const { data: doMes } = await supabase
      .from("lancamentos")
      .select("tipo, valor")
      .gte("data_registro", mDe)
      .lte("data_registro", mAte);

    let r = 0;
    let d = 0;
    for (const l of doMes ?? []) {
      if (l.tipo === "receita") r += Number(l.valor);
      else if (l.tipo === "despesa") d += Number(l.valor);
    }

    meses.push({
      mes: mDe,
      rotulo: `${nomeMes(ref.getMonth()).slice(0, 3)}/${String(ref.getFullYear()).slice(2)}`,
      receitas: r,
      despesas: d,
    });
  }

  return {
    despesasPorCategoria: agrupar(despesas),
    receitasPorCategoria: agrupar(receitas),
    meses,
    totalDespesas: despesas.reduce((s, l) => s + l.valor, 0),
    totalReceitas: receitas.reduce((s, l) => s + l.valor, 0),
    despesasCruas: despesas.map((l) => ({
      valor: l.valor,
      data: l.data,
      noCartao: l.noCartao,
    })),
    totalAnterior,
    diasNoPeriodo: umDia(duracaoMs),
  };
}
