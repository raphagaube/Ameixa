"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const HEX = /^#[0-9a-fA-F]{6}$/;

const esquema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Dê um nome à categoria.").max(40, "Nome muito longo."),
  tipo: z.enum(["despesa", "receita"]),
  cor: z.string().regex(HEX, "Cor inválida."),
  cor_texto: z.string().regex(HEX, "Cor de texto inválida."),
  subcategorias: z.array(z.string().trim().min(1)).max(40),
});

export type EntradaCategoria = z.input<typeof esquema>;
export type Resultado = { ok: true } | { ok: false; erro: string };

export async function salvarCategoria(entrada: EntradaCategoria): Promise<Resultado> {
  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, nome, tipo, cor, cor_texto, subcategorias } = validado.data;

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  let categoriaId = id;

  if (id) {
    const { error } = await supabase
      .from("categorias")
      .update({ nome, tipo, cor, cor_texto })
      .eq("id", id);
    if (error) return { ok: false, erro: traduzir(error.message) };
  } else {
    const { data, error } = await supabase
      .from("categorias")
      .insert({ user_id: user.id, nome, tipo, cor, cor_texto })
      .select("id")
      .single();
    if (error || !data) return { ok: false, erro: traduzir(error?.message ?? "") };
    categoriaId = data.id;
  }

  // Subcategorias: troca o conjunto inteiro. São poucas por categoria, e
  // assim um item renomeado não vira duplicata.
  const limpas = [...new Set(subcategorias.map((s) => s.trim()).filter(Boolean))];

  await supabase.from("subcategorias").delete().eq("categoria_id", categoriaId!);

  if (limpas.length > 0) {
    const { error } = await supabase.from("subcategorias").insert(
      limpas.map((n) => ({
        user_id: user.id,
        categoria_id: categoriaId!,
        nome: n,
      })),
    );
    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  revalidatePath("/categorias");
  return { ok: true };
}

export async function excluirCategoria(id: string): Promise<Resultado> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, erro: "Categoria inválida." };
  }

  const supabase = await criarClienteServidor();

  // Lançamentos apontam para a categoria; o banco impede apagar se houver.
  const { count } = await supabase
    .from("lancamentos")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      erro: `Essa categoria está em ${count} lançamento${count > 1 ? "s" : ""}. Troque a categoria deles antes de excluir.`,
    };
  }

  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzir(error.message) };

  revalidatePath("/categorias");
  return { ok: true };
}

/** Os erros do Postgres vêm em inglês; a interface é toda em português. */
function traduzir(bruto: string): string {
  const m = bruto.toLowerCase();
  if (m.includes("duplicate key") || m.includes("unique"))
    return "Já existe uma categoria com esse nome.";
  if (m.includes("foreign key"))
    return "Essa categoria está em uso e não pode ser excluída.";
  if (m.includes("row-level security"))
    return "Sessão expirada. Entre de novo.";
  return "Não deu para salvar. Tente novamente.";
}
