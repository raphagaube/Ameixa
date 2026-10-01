/**
 * Formatação pt-BR. Regra inviolável do projeto: moeda R$ 1.234,56 e datas
 * dd/mm/aaaa. Nenhum texto da interface em inglês.
 */

const moedaBr = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numeroBr = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** R$ 1.234,56 */
export function moeda(valor: number): string {
  return moedaBr.format(valor);
}

/** 1.234,56 — sem o símbolo, para quando o R$ já aparece no rótulo. */
export function numero(valor: number): string {
  return numeroBr.format(valor);
}

/** Forma curta usada em cima das barras do gráfico: 5,2k */
export function moedaCurta(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1000) {
    const k = valor / 1000;
    const casas = Math.abs(k) >= 10 ? 0 : 1;
    return `${k.toFixed(casas).replace(".", ",")}k`;
  }
  return String(Math.round(valor));
}

/** Máscara de ocultar valores nos relatórios. */
export const VALOR_OCULTO = "••••••";

export function moedaOuOculto(valor: number, ocultar: boolean): string {
  return ocultar ? VALOR_OCULTO : moeda(valor);
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function nomeMes(indice: number): string {
  return MESES[((indice % 12) + 12) % 12];
}

export function mesAno(data: Date): string {
  return `${nomeMes(data.getMonth())} ${data.getFullYear()}`;
}

/**
 * Datas do banco chegam como 'aaaa-mm-dd'. Montar com new Date(texto) faria o
 * navegador ler como UTC e voltar um dia em fusos negativos — o Brasil inteiro.
 */
export function dataDoBanco(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

/** O fuso do app: o dono vive e paga as contas no horário de Brasília. */
const FUSO = "America/Sao_Paulo";

/**
 * O dia de hoje em Brasília, como data local (meia-noite).
 *
 * O servidor da Vercel roda em UTC, três horas à frente: das 21h à meia-noite
 * de Brasília, `new Date()` no servidor já é o dia seguinte. Nesse intervalo
 * o extrato abria no mês que vem, o Registro Fácil gravava o gasto com a data
 * de amanhã e o saldo contava lançamento de amanhã como se já tivesse saído.
 *
 * Devolve uma data cujos `getFullYear`, `getMonth` e `getDate` são os de
 * Brasília em qualquer máquina — é só trocar `new Date()` por esta função
 * onde a pergunta é "que dia é hoje?". Para instantes (carimbo de hora,
 * validade de token) continue usando `new Date()`.
 */
export function hojeEmBrasilia(agora: Date = new Date()): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const parte = (tipo: string) => Number(partes.find((x) => x.type === tipo)?.value);
  return new Date(parte("year"), parte("month") - 1, parte("day"));
}

export function paraIso(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${m}-${d}`;
}

/** dd/mm/aaaa */
export function dataBr(valor: Date | string): string {
  const d = typeof valor === "string" ? dataDoBanco(valor) : valor;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getFullYear()}`;
}
