"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { drenarFila } from "@/lib/agenda/sincronizar";
import { filtroExclusao, filtrarExclusao, TAMANHO_LOTE_EXCLUSAO } from "@/lib/exclusao-lancamentos";

const instante = z.string().datetime().refine((v) => Date.parse(v) <= Date.now(), "Prévia inválida.");
const cursorEsquema = z.object({ ateCriadoEm: instante, apos: z.string().uuid() });
type Falha = { ok: false; erro: string };
export type PaginaExclusao = {
  ok: true; ids: string[]; total: number | null; ateCriadoEm: string; proxima: string | null;
} | Falha;
export type ExclusaoDoLote = {
  ok: true; excluidos: number; ignorados: number; avisoAgenda: boolean;
} | Falha;

/** Lê só IDs, em páginas, sem o teto do extrato e sem alterar os dados. */
export async function prepararExclusao(entrada: unknown, cursor?: unknown): Promise<PaginaExclusao> {
  const f = filtroExclusao.safeParse(entrada);
  const c = cursor === undefined ? null : cursorEsquema.safeParse(cursor);
  if (!f.success) return { ok: false, erro: f.error.issues[0]?.message ?? "Período inválido." };
  if (c && !c.success) return { ok: false, erro: "Prévia inválida. Confira novamente." };

  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const pagina = c?.success ? c.data : null;
  const ateCriadoEm = pagina?.ateCriadoEm ?? new Date().toISOString();
  let q = filtrarExclusao(
    supabase.from("lancamentos").select("id", pagina ? {} : { count: "exact" }),
    user.id, f.data, ateCriadoEm,
  );
  if (pagina) q = q.gt("id", pagina.apos);
  const { data, count, error } = await q.order("id").limit(TAMANHO_LOTE_EXCLUSAO);
  if (error) return { ok: false, erro: "Não deu para conferir os lançamentos. Tente novamente." };
  const ids = (data ?? []).map((l) => l.id as string);
  return {
    ok: true, ids, total: count, ateCriadoEm,
    proxima: ids.length === TAMANHO_LOTE_EXCLUSAO ? ids[ids.length - 1] : null,
  };
}

/** Só recebe os IDs da prévia confirmada. Novos registros ficam de fora. */
export async function excluirLoteConfirmado(entrada: unknown, ids: unknown, corte: unknown): Promise<ExclusaoDoLote> {
  const f = filtroExclusao.safeParse(entrada);
  const v = z.array(z.string().uuid()).min(1).max(TAMANHO_LOTE_EXCLUSAO).safeParse(ids);
  const t = instante.safeParse(corte);
  if (!f.success || !v.success || !t.success) return { ok: false, erro: "Seleção inválida. Confira novamente." };
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  // Preserva também registros editados depois que a prévia foi preparada.
  const candidatos = await filtrarExclusao(
    supabase.from("lancamentos").select("id").in("id", v.data),
    user.id, f.data, t.data,
  ).lte("atualizado_em", t.data);
  if (candidatos.error) return { ok: false, erro: "Não deu para conferir a seleção. Nada foi excluído neste lote." };
  const selecionados = (candidatos.data ?? []).map((l) => l.id as string);
  if (!selecionados.length) return { ok: true, excluidos: 0, ignorados: v.data.length, avisoAgenda: false };

  // O vínculo com a agenda some em cascata; precisa ser lido antes.
  const eventos = await supabase.from("eventos_agenda")
    .select("lancamento_id, calendario_id, evento_id").eq("user_id", user.id)
    .in("lancamento_id", selecionados);
  if (eventos.error) return { ok: false, erro: "Não deu para conferir os vínculos com a agenda. Nada foi excluído neste lote." };

  const apagados = await filtrarExclusao(
    supabase.from("lancamentos").delete().in("id", selecionados),
    user.id, f.data, t.data,
  ).lte("atualizado_em", t.data).select("id");
  if (apagados.error) return { ok: false, erro: "Não deu para excluir este lote. Confira a seleção antes de tentar novamente." };
  const excluidos = new Set((apagados.data ?? []).map((l) => l.id as string));
  const cargas = (eventos.data ?? []).filter((e) => excluidos.has(e.lancamento_id)).map((e) => ({
    user_id: user.id, acao: "apagar", carga: { calendario_id: e.calendario_id, evento_id: e.evento_id },
  }));
  let avisoAgenda = false;
  if (cargas.length) {
    try {
      const fila = await supabase.from("fila_agenda").insert(cargas);
      avisoAgenda = !!fila.error;
      if (!fila.error) after(() => drenarFila(20));
    } catch { avisoAgenda = true; }
  }
  revalidatePath("/", "layout");
  return { ok: true, excluidos: excluidos.size, ignorados: v.data.length - excluidos.size, avisoAgenda };
}
