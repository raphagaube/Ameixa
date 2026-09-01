"use server";

import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { LancamentoParaCasar } from "@/lib/ofx";

const esquema = z.object({
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contaId: z.string().uuid(),
});

/**
 * Lançamentos da conta no intervalo do extrato, para o casamento.
 * A janela é alargada em 3 dias de cada lado, que é a tolerância do
 * casamento por data.
 */
export async function lancamentosParaCasar(
  entrada: z.input<typeof esquema>,
): Promise<LancamentoParaCasar[]> {
  const v = esquema.safeParse(entrada);
  if (!v.success) return [];

  const folga = (iso: string, dias: number) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("lancamentos")
    .select("id, valor, data_registro, descricao, fitid")
    .eq("conta_id", v.data.contaId)
    .neq("tipo", "aporte")
    .gte("data_registro", folga(v.data.de, -3))
    .lte("data_registro", folga(v.data.ate, 3));

  return (data ?? []).map((l) => ({
    id: l.id,
    valor: Number(l.valor),
    data: l.data_registro,
    descricao: l.descricao,
    fitid: l.fitid,
  }));
}
