"use server";

import { revalidatePath } from "next/cache";
import { enfileirar } from "@/lib/agenda/sincronizar";
import { z } from "zod";
import { criarClienteServidor, usuarioAtual } from "@/lib/supabase/servidor";
import { tintaSobreAcento } from "@/lib/theme";

const HEX = /^#[0-9a-fA-F]{6}$/;

const decisao = z.object({
  /** Nome vindo da planilha, já sem os parênteses. */
  nome: z.string().trim().min(1).max(40),
  tipo: z.enum(["despesa", "receita"]),
  cor: z.string().regex(HEX),
  /** Categoria já existente escolhida pelo usuário, ou null para criar. */
  categoriaId: z.string().uuid().nullable(),
  ids: z.array(z.string().uuid()).min(1).max(5000),
});

const esquema = z.object({
  decisoes: z.array(decisao).min(1).max(60),
});

export type Decisao = z.input<typeof decisao>;
export type ResultadoOrganizar =
  | { ok: true; categoriasCriadas: number; lancamentosAtualizados: number }
  | { ok: false; erro: string };

/**
 * Cria as categorias que faltavam e carimba os lançamentos pendentes.
 *
 * Depois de receber categoria, o lançamento deixa de ser pendência: é o
 * `incompleto = false` que o tira da lista de coisas a fazer.
 */
export async function organizarPendencias(
  entrada: z.input<typeof esquema>,
): Promise<ResultadoOrganizar> {
  const v = esquema.safeParse(entrada);
  if (!v.success) {
    return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await usuarioAtual();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const supabase = await criarClienteServidor();

  let criadas = 0;
  let atualizados = 0;

  for (const d of v.data.decisoes) {
    let categoriaId = d.categoriaId;

    if (!categoriaId) {
      const { data, error } = await supabase
        .from("categorias")
        .insert({
          user_id: user.id,
          nome: d.nome,
          tipo: d.tipo,
          cor: d.cor,
          // A tinta sai da luminância da cor, o mesmo cálculo do tema.
          cor_texto: tintaSobreAcento(d.cor),
        })
        .select("id")
        .single();

      if (error || !data) {
        // Nome repetido: aproveita a que já existe em vez de falhar.
        const { data: achada } = await supabase
          .from("categorias")
          .select("id")
          .eq("nome", d.nome)
          .eq("tipo", d.tipo)
          .maybeSingle();

        if (!achada) {
          return {
            ok: false,
            erro: `Não deu para criar a categoria "${d.nome}".`,
          };
        }
        categoriaId = achada.id;
      } else {
        categoriaId = data.id;
        criadas++;
      }
    }

    // Em blocos: a lista de ids vai na URL do PostgREST e milhares de uuids
    // estouram o tamanho máximo.
    const TAMANHO = 200;
    for (let i = 0; i < d.ids.length; i += TAMANHO) {
      const bloco = d.ids.slice(i, i + TAMANHO);
      const { data: mexidos, error } = await supabase
        .from("lancamentos")
        .update({ categoria_id: categoriaId, incompleto: false })
        .in("id", bloco)
        .select("id, situacao");

      if (error) {
        return {
          ok: false,
          erro:
            atualizados > 0
              ? `Organizei ${atualizados} lançamentos e parei num erro. Os que entraram já estão certos.`
              : "Não deu para organizar. Tente de novo.",
        };
      }
      atualizados += bloco.length;

      // A categoria aparece na descrição do evento, então quem já está na
      // agenda precisa ser reescrito. Pela fila: são até 200 por bloco.
      await enfileirar(
        (mexidos ?? [])
          .filter((l) => l.situacao === "a_pagar" || l.situacao === "a_receber")
          .map((l) => l.id),
        "salvar",
      );
    }
  }

  for (const p of ["/", "/extrato", "/pendencias", "/relatorios", "/categorias", "/orcamentos"]) {
    revalidatePath(p);
  }

  return {
    ok: true,
    categoriasCriadas: criadas,
    lancamentosAtualizados: atualizados,
  };
}
