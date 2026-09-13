"use server";

import { lancamentosParaPlanilha } from "@/lib/dados/lancamentos";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export type ResultadoPlanilha =
  | { ok: true; lancamentos: LancamentoNaLista[] }
  | { ok: false; erro: string };

/**
 * Os lançamentos que vão para a planilha. A planilha em si é montada no
 * navegador: o SheetJS já é carregado lá para a importação, e assim o
 * arquivo não passa pelo servidor.
 */
export async function buscarLancamentosParaPlanilha(
  de: string,
  ate: string,
): Promise<ResultadoPlanilha> {
  if ((de && !ISO.test(de)) || (ate && !ISO.test(ate))) {
    return { ok: false, erro: "Período inválido." };
  }
  if (de && ate && de > ate) {
    return { ok: false, erro: "A data inicial é depois da final." };
  }

  const lancamentos = await lancamentosParaPlanilha({
    de: de || undefined,
    ate: ate || undefined,
  });
  if (!lancamentos) {
    return { ok: false, erro: "Não deu para ler os lançamentos. Tente de novo." };
  }
  return { ok: true, lancamentos };
}
