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
