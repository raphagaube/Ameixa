import "server-only";
import { cicloDaFatura, type Ciclo } from "@/lib/fatura";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { contasDoUsuario } from "@/lib/dados/contas";
import type { Cartao } from "@/lib/tipos/contas";

export type CompraDaFatura = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  cor: string;
};

export type Fatura = {
  cartao: Cartao;
  banco: string;
  ciclo: Ciclo;
  total: number;
  compras: CompraDaFatura[];
};

/**
 * Faturas abertas no mês de referência, com o ciclo real de cada cartão —
 * não o mês corrido.
 */
export async function faturasDoMes(ano: number, mes: number): Promise<Fatura[]> {
  const contas = await contasDoUsuario();
  const cartoes = contas.flatMap((c) =>
    c.cartoes.map((k) => ({ cartao: k, banco: c.nome })),
  );
  if (cartoes.length === 0) return [];

  const supabase = await criarClienteServidor();

  return Promise.all(
    cartoes.map(async ({ cartao, banco }) => {
      const ciclo = cicloDaFatura(
        ano,
        mes,
        cartao.dia_fechamento,
        cartao.dia_vencimento,
      );

      const { data } = await supabase
        .from("lancamentos")
        .select("id, descricao, valor, data_registro, categoria:categorias(cor)")
        .eq("cartao_id", cartao.id)
        .eq("tipo", "despesa")
        .gte("data_registro", ciclo.de)
        .lte("data_registro", ciclo.ate)
        .order("data_registro", { ascending: false });

      type Bruto = {
        id: string;
        descricao: string;
        valor: string | number;
        data_registro: string;
        categoria: { cor: string } | { cor: string }[] | null;
      };

      const compras = ((data ?? []) as Bruto[]).map((l) => {
        const cat = Array.isArray(l.categoria) ? l.categoria[0] : l.categoria;
        return {
          id: l.id,
          descricao: l.descricao,
          valor: Number(l.valor),
          data: l.data_registro,
          cor: cat?.cor ?? "#8A8F94",
        };
      });

      return {
        cartao,
        banco,
        ciclo,
        total: compras.reduce((s, c) => s + c.valor, 0),
        compras,
      };
    }),
  );
}
