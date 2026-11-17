"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { iconeCategoriaValido } from "@/lib/icones-categorias";
import { corTextoCategoria } from "@/lib/cores-categoria";

const HEX = /^#[0-9a-fA-F]{6}$/;

const esquema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Dê um nome à categoria.").max(40, "Nome muito longo."),
  tipo: z.enum(["despesa", "receita"]),
  cor: z.string().regex(HEX, "Cor inválida."),
  cor_texto: z.string().regex(HEX, "Cor de texto inválida."),
  icone: z.string().refine(iconeCategoriaValido, "Escolha um ícone válido.").nullable().optional(),
  cor_texto_modo: z.enum(["auto", "branco", "preto"]).optional(),
  subcategorias: z.array(z.string().trim().min(1)).max(40),
});

export type EntradaCategoria = z.input<typeof esquema>;
export type Resultado = { ok: true } | { ok: false; erro: string };

export async function salvarCategoria(entrada: EntradaCategoria): Promise<Resultado> {
  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, nome, tipo, cor, cor_texto, icone, cor_texto_modo, subcategorias } = validado.data;
  const aparencia = {
    nome, tipo, cor,
    cor_texto: cor_texto_modo ? corTextoCategoria(cor, cor_texto_modo) : cor_texto,
    ...(icone !== undefined ? { icone } : {}),
    ...(cor_texto_modo !== undefined ? { cor_texto_modo } : {}),
  };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  let categoriaId = id;

  if (id) {
    const { error } = await supabase
      .from("categorias")
      .update(aparencia)
      .eq("id", id);
    if (error) return { ok: false, erro: traduzir(error.message) };
  } else {
    const { data, error } = await supabase
      .from("categorias")
      .insert({ user_id: user.id, ...aparencia })
      .select("id")
      .single();
    if (error || !data) return { ok: false, erro: traduzir(error?.message ?? "") };
    categoriaId = data.id;
  }

  // Subcategorias: mexe só no que mudou.
  //
  // Antes isto apagava o conjunto inteiro e reinseria. Como as linhas
  // voltavam com id novo e `lancamentos.subcategoria_id` é
  // `on delete set null`, abrir uma categoria só para trocar a cor
  // desligava a subcategoria de todo o histórico dela — em silêncio, sem
  // desfazer. Agora quem não foi tocado nem é escrito, e só some o que o
  // dono de fato tirou da lista.
  const limpas = [...new Set(subcategorias.map((s) => s.trim()).filter(Boolean))];

  const { data: atuais } = await supabase
    .from("subcategorias")
    .select("id, nome")
    .eq("categoria_id", categoriaId!);

  const existentes = new Map((atuais ?? []).map((s) => [s.nome, s.id]));

  const paraCriar = limpas.filter((n) => !existentes.has(n));
  const paraRemover = (atuais ?? []).filter((s) => !limpas.includes(s.nome));

  if (paraCriar.length > 0) {
    const { error } = await supabase.from("subcategorias").insert(
      paraCriar.map((n) => ({
        user_id: user.id,
        categoria_id: categoriaId!,
        nome: n,
      })),
    );
    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  if (paraRemover.length > 0) {
    const { error } = await supabase
      .from("subcategorias")
      .delete()
      .in(
        "id",
        paraRemover.map((s) => s.id),
      );
    if (error) return { ok: false, erro: traduzir(error.message) };
  }

  revalidatePath("/categorias");
  revalidatePath("/", "layout");
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
