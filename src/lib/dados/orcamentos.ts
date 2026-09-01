import "server-only";
import { paraIso } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Orcamento } from "@/lib/tipos/orcamentos";

/** Orçamentos são guardados por mês; a chave é sempre o dia 1. */
export function mesReferencia(ano: number, mes: number): string {
  return paraIso(new Date(ano, mes, 1));
}

export async function orcamentosDoMes(
  ano: number,
  mes: number,
): Promise<Orcamento[]> {
  const supabase = await criarClienteServidor();
  const primeiro = mesReferencia(ano, mes);
  const ultimo = paraIso(new Date(ano, mes + 1, 0));

  const [{ data: orcs }, { data: gastos }] = await Promise.all([
    supabase
      .from("orcamentos")
      .select("id, categoria_id, limite, categorias(nome, cor)")
      .eq("mes", primeiro),
    supabase
      .from("lancamentos")
      .select("categoria_id, valor")
      .eq("tipo", "despesa")
      .gte("data_registro", primeiro)
      .lte("data_registro", ultimo),
  ]);

  // Soma dos gastos por categoria no mês. Aportes já ficam de fora porque
  // o filtro pega só tipo = 'despesa'.
  const porCategoria = new Map<string, number>();
  for (const g of gastos ?? []) {
    if (!g.categoria_id) continue;
    porCategoria.set(
      g.categoria_id,
      (porCategoria.get(g.categoria_id) ?? 0) + Number(g.valor),
    );
  }

  return (orcs ?? []).map((o) => {
    const cat = Array.isArray(o.categorias) ? o.categorias[0] : o.categorias;
    return {
      id: o.id,
      categoria_id: o.categoria_id,
      categoria: cat?.nome ?? "Sem categoria",
      cor: cat?.cor ?? "#93B4D8",
      limite: Number(o.limite),
      gasto: porCategoria.get(o.categoria_id) ?? 0,
    };
  });
}
