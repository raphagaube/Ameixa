"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Resultado = { ok: true } | { ok: false; erro: string };

const nomeEsquema = z
  .string()
  .trim()
  .min(2, "Escreva seu nome.")
  .max(60, "Nome muito longo.");

/** O nome aparece na saudação do Início e no cabeçalho dos relatórios. */
export async function alterarNome(nome: string): Promise<Resultado> {
  const v = nomeEsquema.safeParse(nome);
  if (!v.success) {
    return { ok: false, erro: v.error.issues[0]?.message ?? "Nome inválido." };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { error } = await supabase
    .from("perfis")
    .update({ nome: v.data })
    .eq("id", user.id);

  if (error) return { ok: false, erro: "Não deu para salvar o nome." };

  revalidatePath("/");
  revalidatePath("/ajustes");
  return { ok: true };
}

/** Salva a cor de acento escolhida, para valer em qualquer aparelho. */
export async function salvarAcento(hex: string): Promise<Resultado> {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return { ok: false, erro: "Cor inválida." };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { error } = await supabase
    .from("perfis")
    .update({ cor_acento: hex })
    .eq("id", user.id);

  if (error) return { ok: false, erro: "Não deu para salvar a cor." };

  revalidatePath("/ajustes");
  return { ok: true };
}
