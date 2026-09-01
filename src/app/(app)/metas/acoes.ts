"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const esquema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Dê um nome à meta.").max(60),
  alvo: z.number().positive("Quanto você quer juntar precisa ser maior que zero."),
  guardado: z.number().min(0, "Quanto já guardei não pode ser negativo."),
  conta_id: z.string().uuid().nullable(),
  aplicacao: z.string().trim().min(1).max(30),
  tem_prazo: z.boolean(),
  prazo_n: z.number().int().min(1).max(999).nullable(),
  prazo_unidade: z.enum(["dias", "semanas", "meses", "anos"]).nullable(),
});

export type EntradaMeta = z.input<typeof esquema>;
export type Resultado = { ok: true } | { ok: false; erro: string };

export async function salvarMeta(entrada: EntradaMeta): Promise<Resultado> {
  const v = esquema.safeParse(entrada);
  if (!v.success) {
    return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, ...campos } = v.data;

  // Sem prazo, os campos de prazo têm que sair juntos, senão fica lixo salvo.
  const dados = campos.tem_prazo
    ? campos
    : { ...campos, prazo_n: null, prazo_unidade: null };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { error } = id
    ? await supabase.from("metas").update(dados).eq("id", id)
    : await supabase.from("metas").insert({ ...dados, user_id: user.id });

  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidatePath("/metas");
  revalidatePath("/");
  return { ok: true };
}

export async function excluirMeta(id: string): Promise<Resultado> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, erro: "Meta inválida." };
  }

  const supabase = await criarClienteServidor();

  const { count } = await supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("meta_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      erro: `Essa meta tem ${count} aporte${count > 1 ? "s" : ""} guardado${count > 1 ? "s" : ""}. Exclua os aportes no extrato antes — assim o dinheiro volta para a conta.`,
    };
  }

  const { error } = await supabase.from("metas").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidatePath("/metas");
  revalidatePath("/");
  return { ok: true };
}

/** Marca qual meta aparece em destaque no Início. */
export async function destacarMeta(id: string | null): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { error } = await supabase
    .from("perfis")
    .update({ meta_destaque: id })
    .eq("id", user.id);

  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidatePath("/metas");
  revalidatePath("/");
  return { ok: true };
}

function traduzir(bruto: string): string {
  const m = bruto.toLowerCase();
  if (m.includes("duplicate key") || m.includes("unique"))
    return "Já existe uma meta com esse nome.";
  if (m.includes("check constraint"))
    return "O valor do alvo precisa ser maior que zero.";
  if (m.includes("row-level security")) return "Sessão expirada. Entre de novo.";
  return "Não deu para salvar. Tente novamente.";
}
