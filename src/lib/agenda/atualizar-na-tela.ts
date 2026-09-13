import { enviarFilaDaAgenda } from "@/app/(app)/ajustes/agenda";

/** Teto de rodadas: 40 × 15 = 600 compromissos numa mesma espera. */
const MAX_RODADAS = 40;

let emAndamento: Promise<number> | null = null;

/**
 * Leva a fila do Google Agenda até o fim enquanto o dono está na tela.
 *
 * Existe porque edição e exclusão em lote vão para a fila, e a fila só
 * andava quando alguém abria os Ajustes — as mudanças ficavam dias sem
 * chegar ao Google. Aqui a própria tela que mudou os dados empurra a fila,
 * em rodadas curtas (cada uma cabe no tempo de uma função da Vercel).
 *
 * Nunca roda duas vezes ao mesmo tempo: duas rodadas paralelas pegariam os
 * mesmos itens e criariam o mesmo compromisso duas vezes. Quem chama
 * durante uma rodada recebe o resultado dela.
 *
 * Para quando a fila acaba ou quando uma rodada não consegue enviar nada —
 * o que sobrou está esperando nova tentativa ou o Google está fora —, então
 * não fica girando à toa. Devolve quantos continuam na fila.
 */
export function atualizarAgendaNaTela(): Promise<number> {
  if (emAndamento) return emAndamento;

  emAndamento = (async () => {
    let restantes = 0;
    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      try {
        const r = await enviarFilaDaAgenda();
        restantes = r.restantes;
        if (restantes === 0 || r.enviados === 0) break;
      } catch {
        break;
      }
    }
    return restantes;
  })().finally(() => {
    emAndamento = null;
  });

  return emAndamento;
}
