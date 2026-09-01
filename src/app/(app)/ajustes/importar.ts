"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, usuarioAtual } from "@/lib/supabase/servidor";

/**
 * Gravação da importação.
 *
 * Contas, cartões e categorias do arquivo não são recriados: os códigos
 * internos seriam de outro usuário e as chaves estrangeiras quebrariam. O
 * assistente resolve isso de outro jeito — escolhe uma conta para o lote e
 * casa a categoria pelo nome, no navegador, antes de mandar para cá.
 */

const linha = z.object({
  tipo: z.enum(["despesa", "receita"]),
  valor: z.number().positive(),
  descricao: z.string().trim().min(1).max(200),
  data_registro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  situacao: z.enum(["pago", "a_pagar", "recebido", "a_receber"]).optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  conta_id: z.string().uuid().nullable().optional(),
  observacao: z.string().max(2000).nullable().optional(),
  responsavel: z.string().max(60).nullable().optional(),
});

export type LinhaImportada = z.input<typeof linha>;
export type ResultadoImport =
  | { ok: true; criados: number; ignorados: number; pendentes: number }
  | { ok: false; erro: string };

export async function importarLancamentos(
  linhas: unknown[],
): Promise<ResultadoImport> {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return { ok: false, erro: "Não há lançamentos para importar." };
  }
  if (linhas.length > 20000) {
    return {
      ok: false,
      erro: "São muitas linhas de uma vez. Divida em partes menores.",
    };
  }

  const user = await usuarioAtual();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const validas: z.output<typeof linha>[] = [];
  let ignorados = 0;

  for (const l of linhas) {
    const v = linha.safeParse(l);
    if (v.success) validas.push(v.data);
    else ignorados++;
  }

  if (validas.length === 0) {
    return {
      ok: false,
      erro: "Nenhuma linha tinha data, valor e descrição ao mesmo tempo.",
    };
  }

  const paraGravar = validas.map((l) => ({
    user_id: user.id,
    tipo: l.tipo,
    valor: l.valor,
    descricao: l.descricao,
    data_registro: l.data_registro,
    situacao: l.situacao ?? (l.tipo === "receita" ? "recebido" : "pago"),
    categoria_id: l.categoria_id ?? null,
    conta_id: l.conta_id ?? null,
    observacao: l.observacao ?? null,
    responsavel: l.responsavel ?? null,
    importado: true,
    // Só vira pendência o que ficou sem categoria — com ela, o lançamento já
    // nasce completo e não engorda a lista de coisas a fazer.
    incompleto: !l.categoria_id,
  }));

  const supabase = await criarClienteServidor();

  // Em blocos: milhares de linhas numa requisição só estouram o limite de
  // tamanho do PostgREST.
  const TAMANHO_BLOCO = 400;
  let gravados = 0;

  for (let i = 0; i < paraGravar.length; i += TAMANHO_BLOCO) {
    const bloco = paraGravar.slice(i, i + TAMANHO_BLOCO);
    const { error } = await supabase.from("lancamentos").insert(bloco);

    if (error) {
      return {
        ok: false,
        erro:
          gravados > 0
            ? `Importei ${gravados} lançamentos e parei num erro. Os que entraram já estão no app.`
            : "Não deu para importar. Tente de novo em instantes.",
      };
    }
    gravados += bloco.length;
  }

  for (const p of ["/", "/extrato", "/pendencias", "/relatorios", "/orcamentos"]) {
    revalidatePath(p);
  }

  return {
    ok: true,
    criados: gravados,
    ignorados,
    pendentes: paraGravar.filter((l) => l.incompleto).length,
  };
}
