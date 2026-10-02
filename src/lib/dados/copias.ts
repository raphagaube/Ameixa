import "server-only";
import type { ParaCopias } from "@/lib/copias";
import { lerTudo } from "@/lib/supabase/paginas";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type LancamentoParaCopias = ParaCopias & {
  situacao: string;
  categoria: string | null;
};

/**
 * Todos os lançamentos, com o que a busca de cópias precisa: o conteúdo que
 * identifica o par, os detalhes que precisam continuar iguais e quando cada
 * um foi gravado. `null` se a leitura falhar — com metade da lista, um
 * original poderia passar por cópia.
 */
export async function lancamentosParaCopias(): Promise<LancamentoParaCopias[] | null> {
  const supabase = await criarClienteServidor();
  const linhas = await lerTudo((de, ate) =>
    supabase
      .from("lancamentos")
      .select(
        "id, tipo, valor, descricao, data_registro, data_vencimento, situacao, categoria_id, subcategoria_id, conta_id, importado, criado_em, categoria:categorias(nome)",
      )
      .neq("tipo", "aporte")
      .order("id", { ascending: true })
      .range(de, ate),
  );
  if (!linhas) return null;

  type Bruto = {
    id: string;
    tipo: string;
    valor: string | number;
    descricao: string;
    data_registro: string;
    data_vencimento: string | null;
    situacao: string;
    categoria_id: string | null;
    subcategoria_id: string | null;
    conta_id: string | null;
    importado: boolean | null;
    criado_em: string;
    categoria: { nome: string } | { nome: string }[] | null;
  };

  return (linhas as unknown as Bruto[]).map((l) => {
    const cat = Array.isArray(l.categoria) ? (l.categoria[0] ?? null) : l.categoria;
    return {
      id: l.id,
      tipo: l.tipo,
      valor: Number(l.valor),
      descricao: l.descricao,
      data_registro: String(l.data_registro).slice(0, 10),
      situacao: l.situacao,
      importado: !!l.importado,
      criado_em: l.criado_em,
      categoria: cat?.nome ?? null,
      // As chaves são os nomes que a tela mostra em "difere em".
      detalhes: {
        situação: l.situacao,
        vencimento: l.data_vencimento ? String(l.data_vencimento).slice(0, 10) : null,
        categoria: l.categoria_id,
        subcategoria: l.subcategoria_id,
        conta: l.conta_id,
      },
    };
  });
}
