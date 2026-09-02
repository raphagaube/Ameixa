/**
 * Como um lançamento vira compromisso no Google Agenda.
 *
 * Tudo aqui é função pura: nada de rede, nada de banco. É o que permite
 * travar em teste o comportamento que só apareceria no celular do dono
 * três dias depois — a hora do lembrete, o fim exclusivo do evento de dia
 * inteiro, o que muda quando a conta é paga.
 */

import { moeda } from "@/lib/formato";
import type { LancamentoNaLista, Situacao } from "@/lib/tipos/lancamentos";

/** As duas agendas. O tipo do lançamento decide em qual ele entra. */
export type Agenda = "pagar" | "receber";

export const NOME_AGENDA: Record<Agenda, string> = {
  pagar: "Ameixa Contas a pagar",
  receber: "Ameixa contas a receber",
};

const PENDENTES: Situacao[] = ["a_pagar", "a_receber"];
const QUITADAS: Situacao[] = ["pago", "recebido"];

/**
 * Lembrete às 9h do dia anterior.
 *
 * Em evento de dia inteiro o Google conta os minutos a partir da meia-noite
 * do dia do evento. 1440 (o "um dia antes" que parece óbvio) dispararia à
 * meia-noite, com o dono dormindo. 900 minutos são 15 horas antes da
 * meia-noite: 9h da manhã do dia anterior.
 */
export const MINUTOS_DO_LEMBRETE = 900;

/** Cinza do Google, para a conta já quitada não competir com as pendentes. */
const COR_QUITADO = "8";

/**
 * O PostgREST devolve `numeric` como string e relação como objeto OU array,
 * conforme a consulta. Os dois já morderam este projeto antes; normalizar na
 * entrada é mais barato que descobrir no relatório do mês seguinte.
 */
function numeroDe(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function primeiro<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** aaaa-mm-dd do dia seguinte. DTEND de evento de dia inteiro é exclusivo. */
export function diaSeguinte(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** A data que vale é a de vencimento; sem ela, a do registro. */
export function dataDoCompromisso(l: LancamentoNaLista): string {
  return (l.data_vencimento ?? l.data_registro).slice(0, 10);
}

export function agendaDe(l: LancamentoNaLista): Agenda {
  return l.tipo === "receita" ? "receber" : "pagar";
}

/**
 * Um lançamento tem evento enquanto for pendência — e continua tendo depois
 * de quitado, se já tinha. O pedido foi esse: o compromisso não some quando
 * a conta é paga, só para de tocar.
 *
 * Consequência: o que nasce pago (Registro Fácil, conciliação, importação)
 * nunca entra na agenda. Lembrete de conta já paga não serve para nada.
 */
export function deveTerEvento(
  situacao: Situacao,
  jaTemEvento: boolean,
): boolean {
  if (PENDENTES.includes(situacao)) return true;
  return jaTemEvento && QUITADAS.includes(situacao);
}

export function estaQuitado(situacao: Situacao): boolean {
  return QUITADAS.includes(situacao);
}

function titulo(l: LancamentoNaLista): string {
  const v = moeda(numeroDe(l.valor));
  switch (l.situacao) {
    case "pago":
      return `Pago · ${v} · ${l.descricao}`;
    case "recebido":
      return `Recebido · ${v} · ${l.descricao}`;
    case "a_receber":
      return `Receber ${v} · ${l.descricao}`;
    default:
      return `Pagar ${v} · ${l.descricao}`;
  }
}

function descricao(l: LancamentoNaLista): string {
  const cat = primeiro(l.categoria);
  const sub = primeiro(l.subcategoria);
  const conta = primeiro(l.conta);
  const cartao = primeiro(l.cartao);

  return [
    cat ? `Categoria: ${cat.nome}${sub ? ` › ${sub.nome}` : ""}` : null,
    conta ? `Conta: ${conta.nome}` : null,
    cartao ? `Cartão: ${cartao.nome}` : null,
    `Valor: ${moeda(numeroDe(l.valor))}`,
    l.parcela_atual && l.parcela_total
      ? `Parcela ${l.parcela_atual} de ${l.parcela_total}`
      : null,
    l.observacao || null,
    "Lançado na Ameixa",
  ]
    .filter(Boolean)
    .join("\n");
}

export type CorpoEvento = {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  transparency: "transparent";
  reminders: {
    useDefault: false;
    overrides: { method: "popup"; minutes: number }[];
  };
  colorId?: string;
  extendedProperties: { private: { ameixa: string; versao: string } };
};

export function montarEvento(l: LancamentoNaLista): CorpoEvento {
  const dia = dataDoCompromisso(l);
  const quitado = estaQuitado(l.situacao);

  return {
    summary: titulo(l),
    description: descricao(l),
    start: { date: dia },
    end: { date: diaSeguinte(dia) },
    // Conta a pagar não é compromisso que ocupa a agenda: quem olha a
    // disponibilidade do dono não deve ver o dia como cheio.
    transparency: "transparent",
    reminders: {
      useDefault: false,
      // Quitada mantém o registro do que foi pago, mas sem tocar.
      overrides: quitado
        ? []
        : [{ method: "popup", minutes: MINUTOS_DO_LEMBRETE }],
    },
    ...(quitado ? { colorId: COR_QUITADO } : {}),
    // Rede de segurança: se `eventos_agenda` se perder, dá para reencontrar
    // o evento por events.list?privateExtendedProperty=ameixa%3D<id>.
    extendedProperties: { private: { ameixa: l.id, versao: "1" } },
  };
}

/**
 * Impressão digital do que aparece no evento. Igual antes e depois de uma
 * edição significa que não há o que mandar para o Google — e cada PATCH
 * poupado é quota que sobra para a importação de 600 linhas.
 */
export function assinatura(l: LancamentoNaLista): string {
  const e = montarEvento(l);
  return JSON.stringify([
    e.summary,
    e.description,
    e.start.date,
    e.reminders.overrides.length,
    e.colorId ?? "",
  ]);
}
