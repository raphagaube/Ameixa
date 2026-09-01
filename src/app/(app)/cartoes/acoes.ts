"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const HEX = /^#[0-9a-fA-F]{6}$/;

const esquemaConta = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Dê um nome ao banco.").max(40, "Nome muito longo."),
  tipo: z.enum(["corrente", "poupanca", "investimento", "dinheiro"]),
  cor: z.string().regex(HEX, "Cor inválida."),
  saldo_inicial: z.number().finite(),
  varias: z.boolean(),
  qtd_contas: z.number().int().min(1).max(99),
  tem_debito: z.boolean(),
  tem_credito: z.boolean(),
  tem_pix: z.boolean(),
});

const esquemaCartao = z.object({
  id: z.string().uuid().optional(),
  conta_id: z.string().uuid("Escolha o banco do cartão."),
  nome: z.string().trim().min(1, "Dê um nome ao cartão.").max(40, "Nome muito longo."),
  bandeira: z.string().trim().min(1).max(20),
  final: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Os 4 últimos dígitos precisam ser 4 números.")
    .or(z.literal("")),
  cor: z.string().regex(HEX, "Cor inválida."),
  limite: z.number().finite().min(0, "Limite não pode ser negativo."),
  dia_fechamento: z.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
  dia_vencimento: z.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
});

export type EntradaConta = z.input<typeof esquemaConta>;
export type EntradaCartao = z.input<typeof esquemaCartao>;
export type Resultado = { ok: true } | { ok: false; erro: string };

export async function salvarConta(entrada: EntradaConta): Promise<Resultado> {
  const v = esquemaConta.safeParse(entrada);
  if (!v.success) return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { id, ...campos } = v.data;
  // "Uma conta só" força a quantidade em 1, senão fica um número órfão salvo.
  const dados = { ...campos, qtd_contas: campos.varias ? campos.qtd_contas : 1 };

  const { error } = id
    ? await supabase.from("contas").update(dados).eq("id", id)
    : await supabase.from("contas").insert({ ...dados, user_id: user.id });

  if (error) return { ok: false, erro: traduzir(error.message, "banco") };

  revalidatePath("/cartoes");
  return { ok: true };
}

export async function excluirConta(id: string): Promise<Resultado> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, erro: "Banco inválido." };

  const supabase = await criarClienteServidor();

  const { count } = await supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("conta_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      erro: `Esse banco está em ${count} lançamento${count > 1 ? "s" : ""}. Troque o banco deles antes de excluir.`,
    };
  }

  const { error } = await supabase.from("contas").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzir(error.message, "banco") };

  revalidatePath("/cartoes");
  return { ok: true };
}

export async function salvarCartao(entrada: EntradaCartao): Promise<Resultado> {
  const v = esquemaCartao.safeParse(entrada);
  if (!v.success) return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { id, final, ...campos } = v.data;
  const dados = { ...campos, final: final === "" ? null : final };

  const { error } = id
    ? await supabase.from("cartoes").update(dados).eq("id", id)
    : await supabase.from("cartoes").insert({ ...dados, user_id: user.id });

  if (error) return { ok: false, erro: traduzir(error.message, "cartão") };

  // O banco do cartão precisa aceitar crédito, senão o cartão fica invisível
  // no formulário de lançamento.
  await supabase.from("contas").update({ tem_credito: true }).eq("id", campos.conta_id);

  revalidatePath("/cartoes");
  return { ok: true };
}

export async function excluirCartao(id: string): Promise<Resultado> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, erro: "Cartão inválido." };

  const supabase = await criarClienteServidor();

  const { count } = await supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("cartao_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      erro: `Esse cartão está em ${count} lançamento${count > 1 ? "s" : ""}. Troque o cartão deles antes de excluir.`,
    };
  }

  const { error } = await supabase.from("cartoes").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzir(error.message, "cartão") };

  revalidatePath("/cartoes");
  return { ok: true };
}

function traduzir(bruto: string, o: string): string {
  const m = bruto.toLowerCase();
  if (m.includes("duplicate key") || m.includes("unique"))
    return `Já existe um ${o} com esse nome.`;
  if (m.includes("foreign key")) return `Esse ${o} está em uso e não pode ser excluído.`;
  if (m.includes("row-level security")) return "Sessão expirada. Entre de novo.";
  if (m.includes("check constraint")) return "Dia de fechamento e vencimento precisam ser entre 1 e 31.";
  return "Não deu para salvar. Tente novamente.";
}
