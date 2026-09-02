/**
 * O que fazer com o evento de um lançamento.
 *
 * Função pura, separada do I/O de propósito: é aqui que mora a regra e é
 * aqui que os erros custam caro (evento duplicado, lembrete que sobrevive
 * ao pagamento, PATCH desnecessário queimando quota).
 */

import {
  agendaDe,
  assinatura,
  deveTerEvento,
  type Agenda,
} from "./evento";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

/** O que já existe no Google, do ponto de vista do banco. */
export type Vinculo = {
  calendario_id: string;
  evento_id: string;
  assinatura: string;
};

export type Plano =
  | { acao: "nada" }
  | { acao: "criar"; agenda: Agenda; assinatura: string }
  | { acao: "atualizar"; evento_id: string; assinatura: string }
  /** Trocou de tipo: o evento muda de agenda e de conteúdo. */
  | { acao: "mover"; evento_id: string; agenda: Agenda; assinatura: string }
  | { acao: "apagar"; calendario_id: string; evento_id: string };

/**
 * @param lancamento  null quando foi excluído.
 * @param vinculo     null quando nunca foi sincronizado.
 * @param idDaAgenda  resolve `Agenda` para o id do calendário no Google,
 *                    para saber se o evento está no lugar certo.
 */
export function planejar(
  lancamento: LancamentoNaLista | null,
  vinculo: Vinculo | null,
  idDaAgenda: (a: Agenda) => string | null,
): Plano {
  if (!lancamento) {
    return vinculo
      ? {
          acao: "apagar",
          calendario_id: vinculo.calendario_id,
          evento_id: vinculo.evento_id,
        }
      : { acao: "nada" };
  }

  const precisa = deveTerEvento(lancamento.situacao, vinculo !== null);

  // Deixou de merecer evento: virou aporte em meta, por exemplo.
  if (!precisa) {
    return vinculo
      ? {
          acao: "apagar",
          calendario_id: vinculo.calendario_id,
          evento_id: vinculo.evento_id,
        }
      : { acao: "nada" };
  }

  const agenda = agendaDe(lancamento);
  const nova = assinatura(lancamento);

  if (!vinculo) return { acao: "criar", agenda, assinatura: nova };

  // Despesa virou receita (ou o contrário): o evento tem que mudar de
  // agenda. `events.move` preserva o id, então o vínculo continua valendo.
  const destino = idDaAgenda(agenda);
  if (destino && vinculo.calendario_id !== destino) {
    return { acao: "mover", evento_id: vinculo.evento_id, agenda, assinatura: nova };
  }

  // Nada do que aparece no evento mudou. Editar a observação interna de um
  // lançamento não precisa custar uma requisição ao Google.
  if (vinculo.assinatura === nova) return { acao: "nada" };

  return { acao: "atualizar", evento_id: vinculo.evento_id, assinatura: nova };
}
