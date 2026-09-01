"use server";

import { lerCsv, mapearLancamentos } from "@/lib/csv";
import { linkParaCsv, pareceHtml } from "@/lib/planilha-google";
import { importarLancamentos } from "./importar";

export type ResultadoPlanilha =
  | { ok: true; criados: number; ignorados: number }
  | { ok: false; erro: string };

/**
 * Busca o CSV da Planilha Google no servidor.
 *
 * Tem que ser no servidor: o navegador bloquearia o pedido por CORS. O link
 * é validado antes — só docs.google.com, só https.
 */
export async function importarDoGoogle(link: string): Promise<ResultadoPlanilha> {
  const alvo = linkParaCsv(link);
  if (!alvo.ok) return { ok: false, erro: alvo.erro };

  let texto: string;
  try {
    const resposta = await fetch(alvo.url, {
      redirect: "follow",
      headers: { accept: "text/csv,text/plain" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!resposta.ok) {
      return {
        ok: false,
        erro:
          resposta.status === 404
            ? "Planilha não encontrada. Confira o link."
            : "O Google recusou o pedido. Verifique se a planilha está compartilhada.",
      };
    }

    texto = await resposta.text();
  } catch {
    return {
      ok: false,
      erro: "Não consegui alcançar o Google. Tente de novo em instantes.",
    };
  }

  // Planilha privada devolve a página de login, com status 200.
  if (pareceHtml(texto)) {
    return {
      ok: false,
      erro: 'A planilha está privada. Abra "Compartilhar" e deixe como "Qualquer pessoa com o link".',
    };
  }

  const linhas = mapearLancamentos(lerCsv(texto));
  if (linhas.length === 0) {
    return {
      ok: false,
      erro: "Li a planilha, mas não achei lançamentos. Ela precisa ter as colunas Data, Descrição e Valor na primeira linha.",
    };
  }

  return importarLancamentos(linhas);
}
