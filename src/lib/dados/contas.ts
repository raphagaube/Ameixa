import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Conta } from "@/lib/tipos/contas";

export async function contasDoUsuario(): Promise<Conta[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("contas")
    .select(
      "id, nome, tipo, cor, saldo_inicial, saldo_conferido_em, varias, qtd_contas, tem_debito, tem_credito, tem_pix, cartoes(id, conta_id, nome, bandeira, final, cor, limite, dia_fechamento, dia_vencimento)",
    )
    .eq("arquivada", false)
    .order("nome", { ascending: true });

  if (error || !data) return [];

  return data.map((c) => ({
    ...c,
    saldo_inicial: Number(c.saldo_inicial),
    cartoes: (c.cartoes ?? []).map((k) => ({ ...k, limite: Number(k.limite) })),
  })) as Conta[];
}
