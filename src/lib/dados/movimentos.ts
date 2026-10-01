import "server-only";
import { cache } from "react";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { lerTudo } from "@/lib/supabase/paginas";

export type Movimento = {
  conta_id: string | null;
  tipo: string;
  valor: number;
  /** Data do registro, aaaa-mm-dd. */
  data: string;
  incompleto: boolean;
};

/**
 * Todos os lançamentos, só com o que o saldo precisa.
 *
 * O saldo das contas e o resumo do mês leem daqui e cortam na data que cada
 * um precisa. Antes cada um fazia a própria consulta "tudo até a data X", sem
 * paginar: com mais de mil lançamentos o Supabase devolvia só os mil
 * primeiros e o saldo do Início saía errado, sem aviso.
 *
 * `cache()` faz o Início, que usa os dois, ler uma vez só por requisição.
 */
export const todosOsMovimentos = cache(async (): Promise<Movimento[]> => {
  const supabase = await criarClienteServidor();
  const linhas = await lerTudo((de, ate) =>
    supabase
      .from("lancamentos")
      .select("conta_id, tipo, valor, data_registro, incompleto")
      .order("id", { ascending: true })
      .range(de, ate),
  );

  return (linhas ?? []).map((l) => ({
    conta_id: l.conta_id as string | null,
    tipo: l.tipo as string,
    valor: Number(l.valor),
    data: String(l.data_registro).slice(0, 10),
    incompleto: !!l.incompleto,
  }));
});
