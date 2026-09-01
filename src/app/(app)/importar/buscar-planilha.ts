"use server";

import { linkParaCsv, pareceHtml } from "@/lib/planilha-google";

export type ResultadoBusca =
  | { ok: true; csv: string }
  | { ok: false; erro: string };

/**
 * Baixa o CSV da Planilha Google.
 *
 * Tem que rodar no servidor: o navegador bloquearia por CORS. O link é
 * validado antes — só docs.google.com, só https.
 */
export async function buscarPlanilhaGoogle(link: string): Promise<ResultadoBusca> {
  const alvo = linkParaCsv(link);
  if (!alvo.ok) return { ok: false, erro: alvo.erro };

  try {
    const resposta = await fetch(alvo.url, {
      redirect: "follow",
      headers: { accept: "text/csv,text/plain" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
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

    const csv = await resposta.text();

    // Planilha privada devolve a página de login, com status 200.
    if (pareceHtml(csv)) {
      return {
        ok: false,
        erro: 'A planilha está privada. Abra "Compartilhar" e escolha "Qualquer pessoa com o link".',
      };
    }

    return { ok: true, csv };
  } catch {
    return {
      ok: false,
      erro: "Não consegui alcançar o Google. Tente de novo em instantes.",
    };
  }
}
