import { paraIso } from "@/lib/formato";
import {
  type Frequencia,
  type Situacao,
  type TipoLancamento,
  type TipoRepeticao,
  type UnidadeIntervalo,
  situacaoPadrao,
} from "@/lib/tipos/lancamentos";

/** Teto de segurança: uma recorrência mal configurada não vira 10 mil linhas. */
export const MAX_OCORRENCIAS = 240;

export type BaseSerie = {
  tipo: TipoLancamento;
  descricao: string;
  dataRegistro: string;
  dataVencimento: string | null;
  situacao: Situacao;
};

export type ConfigSerie =
  | { repeticao: "unica" }
  | { repeticao: "parcelada"; parcelaAtual: number; parcelaTotal: number }
  | {
      repeticao: "recorrente";
      frequencia: Frequencia;
      /** Só em "personalizado": de quantas em quantas unidades repete. */
      intervalo?: number;
      /** Só em "personalizado". */
      unidade?: UnidadeIntervalo;
      /** Quantas gerar. Ignorado quando `ate` está preenchido. */
      ocorrencias: number;
      /** Repetir até esta data, em vez de contar repetições. */
      ate?: string | null;
    }
  | { repeticao: "assinatura"; meses: number };

export type Ocorrencia = {
  descricao: string;
  data_registro: string;
  data_vencimento: string | null;
  situacao: Situacao;
  serie_tipo: TipoRepeticao | null;
  parcela_atual: number | null;
  parcela_total: number | null;
};

/**
 * Soma meses preservando o fim do mês. 31/01 + 1 mês precisa virar 28/02,
 * não 03/03 — que é o que o JavaScript faz sozinho.
 */
function somarMeses(d: Date, n: number): Date {
  const dia = d.getDate();
  const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimoDiaDoMes = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(dia, ultimoDiaDoMes));
  return alvo;
}

function somarDias(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * De quanto em quanto tempo a série anda.
 *
 * "personalizado" deixou de ser um sinônimo de mensal: agora ele usa o
 * intervalo e a unidade que o dono escolheu. Antes, escolher
 * "Personalizado" desmarcava "Semanal" e ainda assim gerava mensal — o
 * nome prometia uma coisa e o app fazia outra.
 */
function avancar(
  inicio: Date,
  i: number,
  freq: Frequencia,
  intervalo = 1,
  unidade: UnidadeIntervalo = "meses",
): Date {
  switch (freq) {
    case "semanal":
      return somarDias(inicio, 7 * i);
    case "quinzenal":
      return somarDias(inicio, 14 * i);
    case "semestral":
      return somarMeses(inicio, 6 * i);
    case "anual":
      return somarMeses(inicio, 12 * i);
    case "personalizado": {
      const n = Math.max(1, Math.trunc(intervalo)) * i;
      if (unidade === "dias") return somarDias(inicio, n);
      if (unidade === "semanas") return somarDias(inicio, 7 * n);
      return somarMeses(inicio, n);
    }
    default:
      return somarMeses(inicio, i);
  }
}

function comoData(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Expande um lançamento na lista de ocorrências que devem ir para o banco.
 * A primeira da lista é sempre o próprio lançamento que o usuário salvou.
 *
 * Ocorrências com data futura entram como a pagar / a receber, mesmo que o
 * usuário tenha marcado a primeira como já paga.
 */
export function gerarSerie(
  base: BaseSerie,
  config: ConfigSerie,
  hojeIso: string = paraIso(new Date()),
): Ocorrencia[] {
  const inicio = comoData(base.dataRegistro);

  // Distância entre registro e vencimento é mantida em todas as ocorrências.
  const deslocamento =
    base.dataVencimento === null
      ? null
      : Math.round(
          (comoData(base.dataVencimento).getTime() - inicio.getTime()) / 86400000,
        );

  const monta = (
    data: Date,
    descricao: string,
    parcelaAtual: number | null,
    parcelaTotal: number | null,
    serieTipo: TipoRepeticao | null,
    primeira: boolean,
  ): Ocorrencia => {
    const iso = paraIso(data);
    return {
      descricao,
      data_registro: iso,
      data_vencimento:
        deslocamento === null ? null : paraIso(somarDias(data, deslocamento)),
      // A primeira respeita o que o usuário escolheu; as seguintes seguem a data.
      situacao: primeira ? base.situacao : situacaoPadrao(base.tipo, iso, hojeIso),
      serie_tipo: serieTipo,
      parcela_atual: parcelaAtual,
      parcela_total: parcelaTotal,
    };
  };

  if (config.repeticao === "unica") {
    return [monta(inicio, base.descricao, null, null, null, true)];
  }

  if (config.repeticao === "parcelada") {
    const { parcelaAtual, parcelaTotal } = config;
    const quantas = Math.max(parcelaTotal - parcelaAtual + 1, 1);
    const limite = Math.min(quantas, MAX_OCORRENCIAS);

    return Array.from({ length: limite }, (_, i) => {
      const numero = parcelaAtual + i;
      return monta(
        somarMeses(inicio, i),
        `${base.descricao} — ${numero}/${parcelaTotal}`,
        numero,
        parcelaTotal,
        "parcelada",
        i === 0,
      );
    });
  }

  if (config.repeticao === "assinatura") {
    const total = Math.min(Math.max(config.meses, 1), MAX_OCORRENCIAS);
    return Array.from({ length: total }, (_, i) =>
      monta(
        somarMeses(inicio, i),
        `${base.descricao} — assinatura ${i + 1}/${total}`,
        i + 1,
        total,
        "assinatura",
        i === 0,
      ),
    );
  }

  // Recorrente
  const { frequencia, ocorrencias, ate, intervalo, unidade } = config;
  // Uma data final vale para qualquer frequência. Antes só valia em
  // "personalizado", então não havia como pedir "toda semana até dezembro".
  const usaData = !!ate;
  const fim = usaData ? comoData(ate!) : null;
  const quantas = usaData
    ? MAX_OCORRENCIAS
    : Math.min(Math.max(ocorrencias, 1), MAX_OCORRENCIAS);

  const lista: Ocorrencia[] = [];
  for (let i = 0; i < quantas; i++) {
    const data = avancar(inicio, i, frequencia, intervalo, unidade);
    if (fim && data > fim) break;
    lista.push(monta(data, base.descricao, null, null, "recorrente", i === 0));
  }

  // Uma data final anterior à primeira ocorrência ainda salva o lançamento
  // que o usuário digitou — senão o salvar não faria nada.
  if (lista.length === 0) {
    lista.push(monta(inicio, base.descricao, null, null, "recorrente", true));
  }

  return lista;
}
