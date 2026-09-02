/**
 * Quando a conta precisa de fato ser paga.
 *
 * Boleto que vence num sábado não é pago no sábado: o banco não compensa, e
 * quem deixa para segunda paga juros. A regra do dono é antecipar para o
 * dia útil anterior — e é essa data que vale para o lembrete.
 *
 * O vencimento contratado não é alterado em lugar nenhum: ele continua
 * sendo o que o boleto diz. O que muda é o dia em que o app avisa.
 */

/** aaaa-mm-dd → Date local, sem escorregar de fuso. */
function comoData(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

function comoIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Domingo de Páscoa pelo algoritmo de Meeus/Jones/Butcher.
 *
 * Precisa existir porque quatro feriados brasileiros se movem com ela:
 * Carnaval, Sexta-feira Santa e Corpus Christi. Uma tabela fixa de datas
 * ficaria errada já no ano seguinte.
 */
export function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function somarDias(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Feriados nacionais do Brasil no ano.
 *
 * Só os nacionais: feriado municipal e estadual varia demais para o app
 * chutar, e errar para mais faria a conta ser antecipada sem motivo.
 */
export function feriadosNacionais(ano: number): Set<string> {
  const pascoa = domingoDePascoa(ano);

  const fixos = [
    [1, 1], // Confraternização Universal
    [4, 21], // Tiradentes
    [5, 1], // Dia do Trabalho
    [9, 7], // Independência
    [10, 12], // Nossa Senhora Aparecida
    [11, 2], // Finados
    [11, 15], // Proclamação da República
    [11, 20], // Consciência Negra
    [12, 25], // Natal
  ].map(([m, d]) => comoIso(new Date(ano, m - 1, d)));

  const moveis = [
    somarDias(pascoa, -48), // Carnaval (segunda)
    somarDias(pascoa, -47), // Carnaval (terça)
    somarDias(pascoa, -2), // Sexta-feira Santa
    somarDias(pascoa, 60), // Corpus Christi
  ].map(comoIso);

  return new Set([...fixos, ...moveis]);
}

export function ehFimDeSemana(iso: string): boolean {
  const dia = comoData(iso).getDay();
  return dia === 0 || dia === 6;
}

export function ehFeriado(iso: string): boolean {
  return feriadosNacionais(comoData(iso).getFullYear()).has(iso.slice(0, 10));
}

export function ehDiaUtil(iso: string): boolean {
  return !ehFimDeSemana(iso) && !ehFeriado(iso);
}

/**
 * O dia em que a conta precisa ser paga: o próprio vencimento, ou o dia
 * útil anterior quando ele cai em fim de semana ou feriado.
 *
 * Anda para trás, nunca para frente: pagar depois do vencimento custa
 * juros, pagar antes não custa nada.
 */
export function diaDePagamento(iso: string): string {
  let d = comoData(iso);
  // Dez passos cobrem com folga o pior caso do calendário brasileiro
  // (Natal na quinta emendando com fim de semana, por exemplo).
  for (let i = 0; i < 10; i += 1) {
    const atual = comoIso(d);
    if (ehDiaUtil(atual)) return atual;
    d = somarDias(d, -1);
  }
  return comoIso(d);
}

/** Por que a data foi antecipada, para a tela poder explicar. */
export function motivoDaAntecipacao(iso: string): "fim de semana" | "feriado" | null {
  if (ehFimDeSemana(iso)) return "fim de semana";
  if (ehFeriado(iso)) return "feriado";
  return null;
}
