import "server-only";
import { paraIso } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

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
  texto?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  situacao?: string;
  forma?: string;
  responsavel?: string;
  ordem?: Ordem;
};

export async function lancamentosDoPeriodo(
  f: FiltroExtrato,
): Promise<LancamentoNaLista[]> {
  const supabase = await criarClienteServidor();
  let q = supabase.from("lancamentos").select(CAMPOS);

  if (f.de) q = q.gte("data_registro", f.de);
  if (f.ate) q = q.lte("data_registro", f.ate);
  if (f.texto) q = q.ilike("descricao", `%${f.texto}%`);
  if (f.categoriaId) q = q.eq("categoria_id", f.categoriaId);
  if (f.subcategoriaId) q = q.eq("subcategoria_id", f.subcategoriaId);
  if (f.situacao) q = q.eq("situacao", f.situacao);
  if (f.forma) q = q.eq("forma_pagamento", f.forma);
  if (f.responsavel) q = q.ilike("responsavel", `%${f.responsavel}%`);

  switch (f.ordem ?? "recentes") {
    case "antigos":
      q = q.order("data_registro", { ascending: true });
      break;
    case "maior":
      q = q.order("valor", { ascending: false });
      break;
    case "menor":
      q = q.order("valor", { ascending: true });
      break;
    default:
      q = q.order("data_registro", { ascending: false });
  }
  q = q.order("criado_em", { ascending: false }).limit(500);

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as Bruto[]).map(normalizar);
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

export async function contarPendencias(): Promise<number> {
  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("incompleto", true);
  return count ?? 0;
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

export function limitesDoMes(ano: number, mes: number) {
  return {
    de: paraIso(new Date(ano, mes, 1)),
    ate: paraIso(new Date(ano, mes + 1, 0)),
  };
}
