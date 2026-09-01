"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const esquema = z.object({
  categoria_id: z.string().uuid("Escolha uma categoria."),
  limite: z.number().positive("O limite precisa ser maior que zero."),
  mes: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Mês inválido."),
});

export type Resultado = { ok: true } | { ok: false; erro: string };

export async function salvarOrcamento(
  entrada: z.input<typeof esquema>,
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

  // upsert na chave (user_id, categoria_id, mes): definir de novo o mesmo
  // orçamento troca o limite em vez de dar erro de duplicado.
  const { error } = await supabase
    .from("orcamentos")
    .upsert(
      { ...v.data, user_id: user.id },
      { onConflict: "user_id,categoria_id,mes" },
    );

  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidatePath("/orcamentos");
  return { ok: true };
}

export async function excluirOrcamento(id: string): Promise<Resultado> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, erro: "Orçamento inválido." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("orcamentos").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidatePath("/orcamentos");
  return { ok: true };
}

function traduzir(bruto: string): string {
  const m = bruto.toLowerCase();
  if (m.includes("duplicate key") || m.includes("unique"))
    return "Já existe um orçamento dessa categoria neste mês.";
  if (m.includes("check constraint"))
    return "O limite precisa ser maior que zero.";
  if (m.includes("row-level security")) return "Sessão expirada. Entre de novo.";
  return "Não deu para salvar. Tente novamente.";
}
