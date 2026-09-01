"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * Restauração de backup.
 *
 * Restaura só os lançamentos: contas, cartões e categorias do arquivo teriam
 * ids de outro usuário e as chaves estrangeiras quebrariam. Cada lançamento
 * entra como pendência para você reassociar categoria e conta.
 */

const linha = z.object({
  tipo: z.enum(["despesa", "receita"]),
  valor: z.number().positive(),
  descricao: z.string().trim().min(1).max(200),
  data_registro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  situacao: z
    .enum(["pago", "a_pagar", "recebido", "a_receber"])
    .optional(),
  observacao: z.string().max(2000).nullable().optional(),
  responsavel: z.string().max(60).nullable().optional(),
});

export type LinhaImportada = z.input<typeof linha>;
export type ResultadoImport =
  | { ok: true; criados: number; ignorados: number }
  | { ok: false; erro: string };

export async function importarLancamentos(
  linhas: unknown[],
): Promise<ResultadoImport> {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return { ok: false, erro: "O arquivo não tem lançamentos para importar." };
  }
  if (linhas.length > 5000) {
    return { ok: false, erro: "Arquivo grande demais. Divida em partes menores." };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      erro: "Nenhuma linha do arquivo tinha o formato esperado (tipo, valor, descrição e data).",
    };
  }

  const { error } = await supabase.from("lancamentos").insert(
    validas.map((l) => ({
      user_id: user.id,
      tipo: l.tipo,
      valor: l.valor,
      descricao: l.descricao,
      data_registro: l.data_registro,
      situacao: l.situacao ?? (l.tipo === "receita" ? "recebido" : "pago"),
      observacao: l.observacao ?? null,
      responsavel: l.responsavel ?? null,
      importado: true,
      // Sem categoria e sem conta: entra como pendência para você completar.
      incompleto: true,
    })),
  );

  if (error) {
    return { ok: false, erro: "Não deu para importar. Confira o arquivo e tente de novo." };
  }

  for (const p of ["/", "/extrato", "/pendencias", "/relatorios"]) {
    revalidatePath(p);
  }

  return { ok: true, criados: validas.length, ignorados };
}
