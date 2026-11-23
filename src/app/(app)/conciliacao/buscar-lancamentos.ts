"use server";

import { z } from "zod";
import { lerTudo } from "@/lib/supabase/paginas";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { LancamentoParaCasar } from "@/lib/ofx";

const esquema = z.object({
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contaId: z.string().uuid(),
});

type ResultadoBusca =
  | { ok: true; lancamentos: LancamentoParaCasar[] }
  | { ok: false; erro: string };

/**
 * Lançamentos da conta no intervalo do extrato, para o casamento.
 * A janela é alargada em 3 dias de cada lado, que é a tolerância do
 * casamento por data.
 */
export async function lancamentosParaCasar(
  entrada: z.input<typeof esquema>,
): Promise<ResultadoBusca> {
  const v = esquema.safeParse(entrada);
  if (!v.success) return { ok: false, erro: "A conta ou o período do extrato é inválido." };

  const folga = (iso: string, dias: number) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  const supabase = await criarClienteServidor();
  const data = await lerTudo((de, ate) =>
    supabase
      .from("lancamentos")
      .select("id, tipo, valor, data_registro, descricao, fitid")
      .eq("conta_id", v.data.contaId)
      .neq("tipo", "aporte")
      .gte("data_registro", folga(v.data.de, -3))
      .lte("data_registro", folga(v.data.ate, 3))
      .order("id", { ascending: true })
      .range(de, ate),
  );

  if (!data) {
    return { ok: false, erro: "Não deu para consultar os lançamentos. Escolha o arquivo de novo para tentar novamente." };
  }

  return {
    ok: true,
    lancamentos: data.map((l) => ({
      id: l.id,
      valor: Number(l.valor),
      data: l.data_registro,
      descricao: l.descricao,
      fitid: l.fitid,
      saida: l.tipo === "despesa",
    })),
  };
}
