import "server-only";
import { filtroPeloVencimento } from "@/lib/busca";
import type { DatasPor } from "@/lib/extrato-impresso";
import { nomeMes, paraIso } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { MesMovimento } from "@/lib/relatorio";
import { dataQueVale } from "@/lib/tipos/lancamentos";

export type LinhaCategoria = { nome: string; valor: number; cor: string };

export type DadosRelatorio = {
  despesasPorCategoria: LinhaCategoria[];
  receitasPorCategoria: LinhaCategoria[];
  meses: MesMovimento[];
  totalDespesas: number;
  totalReceitas: number;
  despesasCruas: { valor: number; data: string; noCartao: boolean }[];
  /** Quantos lançamentos entraram no período. Aportes não contam. */
  totalLancamentos: number;
  totalAnterior: number | null;
  diasNoPeriodo: number;
};

type Linha = {
  tipo: string;
  valor: number;
  /** A data que colocou o lançamento no período: vencimento ou registro. */
  data: string;
  noCartao: boolean;
  categoria: { nome: string; cor: string } | null;
};

function agrupar(linhas: Pick<Linha, "valor" | "categoria">[]): LinhaCategoria[] {
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

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/**
 * Os lançamentos de um intervalo, pela data escolhida.
 *
 * Em páginas de mil: o PostgREST corta a resposta em 1000 linhas sem avisar,
 * e um relatório do ano inteiro somava só as mil primeiras.
 */
async function linhasDoPeriodo(
  supabase: Cliente,
  de: string,
  ate: string,
  datasPor: DatasPor,
): Promise<Linha[]> {
  type Bruto = {
    tipo: string;
    valor: string | number;
    data_registro: string;
    data_vencimento: string | null;
    cartao_id: string | null;
    categoria: { nome: string; cor: string } | { nome: string; cor: string }[] | null;
  };

  const linhas: Linha[] = [];
  for (let inicio = 0; ; inicio += 1000) {
    let q = supabase
      .from("lancamentos")
      .select("tipo, valor, data_registro, data_vencimento, cartao_id, categoria:categorias(nome, cor)");
    q =
      datasPor === "vencimento"
        ? q.or(filtroPeloVencimento(de, ate))
        : q.gte("data_registro", de).lte("data_registro", ate);

    const { data, error } = await q.order("id", { ascending: true }).range(inicio, inicio + 999);
    if (error || !data) break;

    for (const l of data as Bruto[]) {
      linhas.push({
        tipo: l.tipo,
        valor: Number(l.valor),
        data: datasPor === "vencimento" ? dataQueVale(l) : l.data_registro.slice(0, 10),
        noCartao: !!l.cartao_id,
        categoria: Array.isArray(l.categoria) ? (l.categoria[0] ?? null) : l.categoria,
      });
    }
    if (data.length < 1000) break;
  }
  return linhas;
}

/**
 * Tudo que os relatórios precisam, para um intervalo de datas concreto.
 *
 * Armadilha nº 6 do handoff: o período precisa ser um intervalo de datas de
 * verdade, não um rótulo como "este mês" — senão o cálculo do período
 * anterior fica impossível.
 *
 * `datasPor` decide qual data põe o lançamento no período. O padrão é o
 * vencimento (com a data do registro para quem não tem vencimento): a escola
 * registrada em fevereiro, com parcela vencendo em outubro, é conta de
 * outubro — pelo registro, ela sumia do relatório do mês em que é paga.
 */
export async function dadosDoRelatorio(
  de: string,
  ate: string,
  datasPor: DatasPor = "vencimento",
): Promise<DadosRelatorio> {
  const supabase = await criarClienteServidor();

  // Mesma duração, imediatamente antes — é o que dá sentido à variação.
  const inicio = new Date(de);
  const fim = new Date(ate);
  const duracaoMs = fim.getTime() - inicio.getTime();
  const anteriorFim = new Date(inicio.getTime() - 86400000);
  const anteriorInicio = new Date(anteriorFim.getTime() - duracaoMs);

  // Evolução dos últimos 6 meses contados a partir do fim do período.
  const primeiroMes = new Date(fim.getFullYear(), fim.getMonth() - 5, 1);
  const fimDoUltimoMes = new Date(fim.getFullYear(), fim.getMonth() + 1, 0);

  const [linhas, antes, evolucao] = await Promise.all([
    linhasDoPeriodo(supabase, de, ate, datasPor),
    linhasDoPeriodo(supabase, paraIso(anteriorInicio), paraIso(anteriorFim), datasPor),
    linhasDoPeriodo(supabase, paraIso(primeiroMes), paraIso(fimDoUltimoMes), datasPor),
  ]);

  // Aportes ficam de fora de tudo: o dinheiro só mudou de lugar.
  const despesas = linhas.filter((l) => l.tipo === "despesa");
  const receitas = linhas.filter((l) => l.tipo === "receita");

  const despesasAntes = antes.filter((l) => l.tipo === "despesa");
  const totalAnterior = despesasAntes.length
    ? despesasAntes.reduce((s, l) => s + l.valor, 0)
    : null;

  const meses: MesMovimento[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(fim.getFullYear(), fim.getMonth() - i, 1);
    const mDe = paraIso(ref);
    const doMes = evolucao.filter((l) => l.data.slice(0, 7) === mDe.slice(0, 7));

    meses.push({
      mes: mDe,
      rotulo: `${nomeMes(ref.getMonth()).slice(0, 3)}/${String(ref.getFullYear()).slice(2)}`,
      receitas: doMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0),
      despesas: doMes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0),
    });
  }

  return {
    despesasPorCategoria: agrupar(despesas),
    receitasPorCategoria: agrupar(receitas),
    totalLancamentos: despesas.length + receitas.length,
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
