import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { Meta } from "@/lib/tipos/metas";

export async function metasDoUsuario(): Promise<Meta[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("metas")
    .select(
      "id, nome, alvo, guardado, conta_id, aplicacao, tem_prazo, prazo_n, prazo_unidade, conta:contas(nome, cor)",
    )
    .order("criado_em", { ascending: true });

  if (error || !data) return [];

  return data.map((m) => ({
    ...m,
    alvo: Number(m.alvo),
    guardado: Number(m.guardado),
    conta: Array.isArray(m.conta) ? (m.conta[0] ?? null) : (m.conta ?? null),
  })) as Meta[];
}
