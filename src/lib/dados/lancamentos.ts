import "server-only";
import { filtroOu, interpretarBusca } from "@/lib/busca";
import { paraIso } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

import { numeroDaParcela, separarSufixo } from "@/lib/recorrentes";

const CAMPOS = `
  id, tipo, valor, descricao, data_registro, data_vencimento, situacao,
  categoria_id, subcategoria_id, conta_id, cartao_id, forma_pagamento,
  responsavel, observacao, meta_id, serie_id, serie_tipo, parcela_atual,
  parcela_total, incompleto,
  categoria:categorias(nome, cor, cor_texto),
  subcategoria:subcategorias(nome),
  conta:contas(nome),
  cartao:cartoes(nome)
`;

type Bruto = Record<string, unknown>;

function normalizar(l: Bruto): LancamentoNaLista {
  // O PostgREST devolve a relação como objeto ou array, dependendo da versão.
  const um = <T,>(v: unknown): T | null =>
    Array.isArray(v) ? ((v[0] as T) ?? null) : ((v as T) ?? null);

  return {
    ...(l as unknown as LancamentoNaLista),
    valor: Number(l.valor),
    categoria: um(l.categoria),
    subcategoria: um(l.subcategoria),
    conta: um(l.conta),
    cartao: um(l.cartao),
  };
}

export type Ordem = "recentes" | "antigos" | "maior" | "menor";

export type FiltroExtrato = {
  de?: string;
  ate?: string;
  /**
   * Qual data o período olha: a do registro (padrão) ou o vencimento — com a
   * data do registro valendo para quem não tem vencimento.
   */
  datasPor?: "registro" | "vencimento";
  texto?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  situacao?: string;
  forma?: string;
  responsavel?: string;
  ordem?: Ordem;
  /** Teto de linhas. O extrato usa o padrão; o relatório pede mais. */
  limite?: number;
  /**
   * Deixa aportes de fora.
   *
   * Aporte em meta não é despesa nem receita — o dinheiro só mudou de
   * lugar. Ele não pode aparecer numa lista que soma gastos, e é a regra
   * inviolável do projeto.
   */
  semAportes?: boolean;
};

export async function lancamentosDoPeriodo(
  f: FiltroExtrato,
): Promise<LancamentoNaLista[]> {
  const supabase = await criarClienteServidor();
  let q = supabase.from("lancamentos").select(CAMPOS);

  if (f.semAportes) q = q.neq("tipo", "aporte");

  // O período pelo vencimento e a busca por descrição ou valor são dois
  // filtros "ou"; vão num parâmetro só, os dois dentro de um "e".
  const grupos: string[] = [];
  const porVencimento = f.datasPor === "vencimento";
  if (porVencimento && (f.de || f.ate)) {
    // Vale o vencimento; quem não tem vencimento conta pela data do registro.
    const faixa = (coluna: string) =>
      [f.de ? `${coluna}.gte.${f.de}` : null, f.ate ? `${coluna}.lte.${f.ate}` : null]
        .filter(Boolean)
        .join(",");
    grupos.push(
      `or(and(${faixa("data_vencimento")}),and(data_vencimento.is.null,${faixa("data_registro")}))`,
    );
  } else {
    if (f.de) q = q.gte("data_registro", f.de);
    if (f.ate) q = q.lte("data_registro", f.ate);
  }
  if (f.texto) {
    // O mesmo campo procura por descrição e por valor: digitar 363 acha a
    // conta de R$ 363,00, não só um estabelecimento chamado 363.
    const busca = interpretarBusca(f.texto);
    const ou = filtroOu(busca);
    if (ou) grupos.push(`or(${ou})`);
    else if (busca.texto) q = q.ilike("descricao", `%${busca.texto}%`);
  }
  if (grupos.length === 1) q = q.or(grupos[0].slice("or(".length, -1));
  else if (grupos.length > 1) q = q.or(`and(${grupos.join(",")})`);

  if (f.categoriaId) q = q.eq("categoria_id", f.categoriaId);
  if (f.subcategoriaId) q = q.eq("subcategoria_id", f.subcategoriaId);
  if (f.situacao) q = q.eq("situacao", f.situacao);
  if (f.forma) q = q.eq("forma_pagamento", f.forma);
  if (f.responsavel) q = q.ilike("responsavel", `%${f.responsavel}%`);

  const ordem = f.ordem ?? "recentes";
  const colunaData = porVencimento ? "data_vencimento" : "data_registro";
  switch (ordem) {
    case "antigos":
      q = q.order(colunaData, { ascending: true, nullsFirst: false });
      break;
    case "maior":
      q = q.order("valor", { ascending: false });
      break;
    case "menor":
      q = q.order("valor", { ascending: true });
      break;
    default:
      q = q.order(colunaData, { ascending: false, nullsFirst: false });
  }
  // O teto era fixo em 500. No relatório "Todo o período" isso cortava a
  // lista sem uma palavra — quem tem mil lançamentos imprimia 500 e não
  // ficava sabendo. Quem chama decide, e o relatório pede o suficiente.
  q = q.order("criado_em", { ascending: false }).limit(f.limite ?? 500);

  const { data, error } = await q;
  if (error || !data) return [];
  const lista = (data as Bruto[]).map(normalizar);

  // Pelo vencimento, quem não tem vencimento entra na ordem pela data do
  // registro — o banco sozinho mandaria todos eles para o fim.
  if (porVencimento && (ordem === "recentes" || ordem === "antigos")) {
    const vale = (l: LancamentoNaLista) => l.data_vencimento ?? l.data_registro;
    lista.sort((a, b) =>
      ordem === "antigos" ? vale(a).localeCompare(vale(b)) : vale(b).localeCompare(vale(a)),
    );
  }
  return lista;
}

/** Lançamentos do Registro Fácil que ainda faltam completar. */
export async function pendencias(): Promise<LancamentoNaLista[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("lancamentos")
    .select(CAMPOS)
    .eq("incompleto", true)
    .order("criado_em", { ascending: false });

  if (error || !data) return [];
  return (data as Bruto[]).map(normalizar);
}

/**
 * Todas as pendências (a pagar e a receber), sem aportes — a matéria-prima
 * da tela de contas recorrentes.
 *
 * Paginado de propósito. Sem `range`, o PostgREST devolve no máximo mil
 * linhas e corta o resto calado; com séries de dois anos isso chega rápido,
 * e uma série cortada ao meio seria corrigida pela metade.
 */
export async function pendenciasTodas(): Promise<LancamentoNaLista[]> {
  const supabase = await criarClienteServidor();
  const PAGINA = 1000;
  const todas: Bruto[] = [];

  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from("lancamentos")
      .select(CAMPOS)
      .in("situacao", ["a_pagar", "a_receber"])
      .neq("tipo", "aporte")
      .order("data_registro", { ascending: true })
      .order("id", { ascending: true })
      .range(de, de + PAGINA - 1);
    if (error || !data) break;
    todas.push(...(data as Bruto[]));
    if (data.length < PAGINA) break;
  }

  return todas.map(normalizar);
}

/**
 * Todas as ocorrências de uma série — pagas e pendentes —, da primeira à
 * última.
 *
 * A chave é a mesma de `agruparSeries`: `s:<serie_id>` para a série que
 * nasceu no formulário, e `d:<tipo>|<nome-base>|<valor>` para as que vieram
 * sem vínculo (importação) e foram juntadas pelo nome e pelo valor.
 */
export async function ocorrenciasDaSerie(chave: string): Promise<LancamentoNaLista[]> {
  const supabase = await criarClienteServidor();

  if (chave.startsWith("s:")) {
    const { data } = await supabase
      .from("lancamentos")
      .select(CAMPOS)
      .eq("serie_id", chave.slice(2))
      .order("data_registro", { ascending: true })
      .limit(1000);
    return naOrdemDaSerie(((data ?? []) as Bruto[]).map(normalizar));
  }

  if (!chave.startsWith("d:")) return [];
  const partes = chave.slice(2).split("|");
  if (partes.length < 3) return [];
  const tipo = partes[0];
  const valor = partes[partes.length - 1];
  const base = partes.slice(1, -1).join("|");
  if (!["despesa", "receita"].includes(tipo) || !/^\d+(\.\d{1,2})?$/.test(valor)) {
    return [];
  }

  const { data } = await supabase
    .from("lancamentos")
    .select(CAMPOS)
    .is("serie_id", null)
    .eq("tipo", tipo)
    .eq("valor", valor)
    .order("data_registro", { ascending: true })
    .limit(1000);

  return naOrdemDaSerie(
    ((data ?? []) as Bruto[])
      .map(normalizar)
      .filter((l) => separarSufixo(l.descricao).base.toLocaleLowerCase("pt-BR") === base),
  );
}

/**
 * Da primeira ocorrência à última.
 *
 * O número da parcela manda — o gravado no campo ou, na série importada, o
 * escrito na descrição "(5/6)". Sem número, vale a data de registro.
 */
function naOrdemDaSerie(lista: LancamentoNaLista[]): LancamentoNaLista[] {
  const numero = (l: LancamentoNaLista) => l.parcela_atual ?? numeroDaParcela(l.descricao);
  return [...lista].sort((a, b) => {
    const na = numero(a);
    const nb = numero(b);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    return a.data_registro.localeCompare(b.data_registro);
  });
}

/**
 * Lançamentos para a planilha, sem teto — todos, ou os de um período.
 *
 * Paginado: o extrato corta em 500 e o PostgREST, sem `range`, em mil. Uma
 * planilha de "todos os lançamentos" que viesse cortada seria pior que
 * nenhuma, porque ninguém repara. Erro no meio devolve `null`, e não a
 * metade que chegou.
 */
export async function lancamentosParaPlanilha(f: {
  de?: string;
  ate?: string;
}): Promise<LancamentoNaLista[] | null> {
  const supabase = await criarClienteServidor();
  const PAGINA = 1000;
  const todos: Bruto[] = [];

  for (let inicio = 0; ; inicio += PAGINA) {
    let q = supabase.from("lancamentos").select(CAMPOS).neq("tipo", "aporte");
    if (f.de) q = q.gte("data_registro", f.de);
    if (f.ate) q = q.lte("data_registro", f.ate);
    const { data, error } = await q
      .order("data_registro", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (error || !data) return null;
    todos.push(...(data as Bruto[]));
    if (data.length < PAGINA) break;
  }

  return todos.map(normalizar);
}

/** Os últimos lançamentos, para o bloco do Início. */
export async function ultimosLancamentos(n = 4): Promise<LancamentoNaLista[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("lancamentos")
    .select(CAMPOS)
    .order("data_registro", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(n);

  return ((data ?? []) as Bruto[]).map(normalizar);
}

/**
 * Quantos lançamentos estão incompletos, no app inteiro.
 *
 * O Início contava só os do mês aberto, mas a tela de Pendências lista
 * todos. Navegar para um mês vazio fazia aparecer "Não há lançamentos
 * pendentes!" com pendências existindo — o único aviso proativo do app
 * dizia o contrário da verdade.
 */
export async function contarPendencias(): Promise<number> {
  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("incompleto", true);
  return count ?? 0;
}

export function limitesDoMes(ano: number, mes: number) {
  return {
    de: paraIso(new Date(ano, mes, 1)),
    ate: paraIso(new Date(ano, mes + 1, 0)),
  };
}
