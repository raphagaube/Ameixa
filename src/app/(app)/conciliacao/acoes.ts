"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const acao = z.object({
  fitid: z.string().min(1).max(200),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valor: z.number().positive(),
  descricao: z.string().min(1).max(200),
  saida: z.boolean(),
  /** conciliar liga o fitid a um lançamento; criar gera um novo */
  acao: z.enum(["conciliar", "criar", "ignorar"]),
  lancamentoId: z.string().uuid().nullable(),
});

const esquema = z.object({
  contaId: z.string().uuid("Escolha a conta do extrato."),
  itens: z.array(acao).max(2000),
});

export type EntradaConciliacao = z.input<typeof esquema>;
export type Resultado =
  | { ok: true; conciliados: number; criados: number }
  | { ok: false; erro: string };

/**
 * Grava a conciliação.
 *
 * Regra 8: o fitid é único por usuário e é gravado nos dois caminhos —
 * ao conciliar um lançamento existente e ao criar um a partir do extrato.
 * É isso que faz reimportar o mesmo arquivo não duplicar nada.
 */
export async function aplicarConciliacao(
  entrada: EntradaConciliacao,
): Promise<Resultado> {
  const v = esquema.safeParse(entrada);
  if (!v.success) {
    return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const conciliar = v.data.itens.filter(
    (i) => i.acao === "conciliar" && i.lancamentoId,
  );
  const criar = v.data.itens.filter((i) => i.acao === "criar");

  for (const i of conciliar) {
    const { error } = await supabase
      .from("lancamentos")
      .update({ fitid: i.fitid, conciliado: true })
      .eq("id", i.lancamentoId!);

    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  if (criar.length > 0) {
    const { error } = await supabase.from("lancamentos").insert(
      criar.map((i) => ({
        user_id: user.id,
        tipo: i.saida ? "despesa" : "receita",
        valor: i.valor,
        descricao: i.descricao,
        data_registro: i.data,
        situacao: i.saida ? "pago" : "recebido",
        conta_id: v.data.contaId,
        fitid: i.fitid,
        conciliado: true,
        importado: true,
        // Sem categoria, vira pendência para o usuário completar depois.
        incompleto: true,
      })),
    );

    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  for (const p of ["/", "/extrato", "/pendencias", "/relatorios"]) {
    revalidatePath(p);
  }

  return { ok: true, conciliados: conciliar.length, criados: criar.length };
}

function traduzir(bruto: string): string {
  const m = bruto.toLowerCase();
  if (m.includes("duplicate key") || m.includes("fitid"))
    return "Parte desses movimentos já tinha sido importada antes. Nada foi duplicado.";
  if (m.includes("row-level security")) return "Sessão expirada. Entre de novo.";
  return "Não deu para aplicar a conciliação. Tente novamente.";
}
