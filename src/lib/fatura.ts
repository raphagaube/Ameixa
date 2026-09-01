/**
 * Ciclo real da fatura do cartão.
 *
 * Regra 5 do modelo de dados: a fatura NÃO é o mês corrido. Compras feitas
 * depois do dia de fechamento caem na fatura seguinte. O protótipo agrupava
 * por mês e o handoff pede explicitamente para corrigir isso ao migrar.
 */

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/** Fechamento no dia 31 num mês de 30 vira o dia 30, não o dia 1 do mês seguinte. */
function diaValido(ano: number, mes: number, dia: number): number {
  return Math.min(dia, ultimoDiaDoMes(ano, mes));
}

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export type Ciclo = { de: string; ate: string; vencimento: string };

/**
 * Intervalo de compras da fatura que vence no mês informado.
 *
 * A fatura de referência (ano, mes) fecha no dia `diaFechamento` desse mês e
 * cobre as compras do dia seguinte ao fechamento anterior até o fechamento.
 */
export function cicloDaFatura(
  ano: number,
  mes: number,
  diaFechamento: number,
  diaVencimento: number,
): Ciclo {
  const fechaDia = diaValido(ano, mes, diaFechamento);
  const fecha = new Date(ano, mes, fechaDia);

  const anteriorRef = new Date(ano, mes - 1, 1);
  const fechaAnteriorDia = diaValido(
    anteriorRef.getFullYear(),
    anteriorRef.getMonth(),
    diaFechamento,
  );
  const inicio = new Date(
    anteriorRef.getFullYear(),
    anteriorRef.getMonth(),
    fechaAnteriorDia + 1,
  );

  // O vencimento cai depois do fechamento; quando o dia é menor, é no mês
  // seguinte — é o caso comum (fecha dia 28, vence dia 5).
  const mesVenc = diaVencimento > diaFechamento ? mes : mes + 1;
  const refVenc = new Date(ano, mesVenc, 1);
  const vencDia = diaValido(
    refVenc.getFullYear(),
    refVenc.getMonth(),
    diaVencimento,
  );

  return {
    de: iso(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()),
    ate: iso(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
    vencimento: iso(refVenc.getFullYear(), refVenc.getMonth(), vencDia),
  };
}

/** Uma compra pertence à fatura quando cai dentro do ciclo. */
export function naFatura(dataCompra: string, ciclo: Ciclo): boolean {
  return dataCompra >= ciclo.de && dataCompra <= ciclo.ate;
}

export type EstadoLimite = "ok" | "atencao" | "estourando";

/** Barra de uso do limite: âmbar a partir de 70%, vermelho a partir de 90%. */
export function estadoDoLimite(usado: number, limite: number): EstadoLimite {
  if (limite <= 0) return "ok";
  const pct = (usado / limite) * 100;
  if (pct >= 90) return "estourando";
  if (pct >= 70) return "atencao";
  return "ok";
}

export function percentualDoLimite(usado: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.round((usado / limite) * 100);
}

export const COR_LIMITE: Record<EstadoLimite, string> = {
  ok: "var(--ok)",
  atencao: "var(--warn)",
  estourando: "var(--bad)",
};
