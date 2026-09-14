import {
  dataQueVale,
  type LancamentoNaLista,
  type TipoLancamento,
} from "@/lib/tipos/lancamentos";

/**
 * O pedaço final que numera a ocorrência: "— 3/10", "— assinatura 2/12" ou
 * "(5/21)". Só conta como sufixo com travessão ou parênteses — "Candeias
 * Ubatuba 21 à 28/12" termina em "28/12" e isso é parte do nome.
 */
const SUFIXO =
  /(\s*[—–-]\s*(?:assinatura\s+)?\d+\s*\/\s*\d+|\s*\(\s*\d+\s*\/\s*\d+\s*\))\s*$/i;

export function separarSufixo(descricao: string): { base: string; sufixo: string } {
  const m = descricao.match(SUFIXO);
  if (!m || m.index === undefined) return { base: descricao.trim(), sufixo: "" };
  return { base: descricao.slice(0, m.index).trim(), sufixo: m[0] };
}

/**
 * O número da ocorrência escrito na descrição: 5 em "(5/6)" ou em "— 5/6".
 *
 * Série que veio de importação não tem `parcela_atual` gravado — o número
 * só existe no texto. Sem lê-lo daqui, a série ficava ordenada pela data
 * de registro, que na importação costuma vir embaralhada.
 */
export function numeroDaParcela(descricao: string): number | null {
  const { sufixo } = separarSufixo(descricao);
  const m = sufixo.match(/(\d+)\s*\/\s*\d+/);
  return m ? Number(m[1]) : null;
}

/** Troca o nome mantendo a numeração da ocorrência. */
export function trocarBase(descricao: string, novaBase: string): string {
  return novaBase.trim() + separarSufixo(descricao).sufixo;
}

export type Serie = {
  chave: string;
  /** Tem `serie_id`: nasceu do formulário como série. */
  vinculada: boolean;
  base: string;
  tipo: TipoLancamento;
  /** Pendentes da série, na ordem em que vencem. */
  itens: LancamentoNaLista[];
  onde: string | null;
};

/**
 * Junta as pendências em séries.
 *
 * O `serie_id` é a ligação certa, mas nem toda série tem: o importador de
 * planilha não grava o campo. Sem ele, duas ou mais pendências com o mesmo
 * nome-base, tipo e valor são tratadas como uma série — é o que o dono
 * enxergaria olhando a lista.
 */
export function agruparSeries(lista: LancamentoNaLista[]): Serie[] {
  const grupos = new Map<string, Serie>();

  for (const l of lista) {
    if (l.tipo === "aporte") continue;
    const { base } = separarSufixo(l.descricao);
    const chave = l.serie_id
      ? `s:${l.serie_id}`
      : `d:${l.tipo}|${base.toLocaleLowerCase("pt-BR")}|${l.valor.toFixed(2)}`;

    const g = grupos.get(chave) ?? {
      chave,
      vinculada: !!l.serie_id,
      base,
      tipo: l.tipo,
      itens: [],
      onde: l.cartao?.nome ?? l.conta?.nome ?? null,
    };
    g.itens.push(l);
    grupos.set(chave, g);
  }

  return [...grupos.values()]
    .filter((g) => g.vinculada || g.itens.length >= 2)
    .map((g) => ({
      ...g,
      itens: [...g.itens].sort((a, b) => dataQueVale(a).localeCompare(dataQueVale(b))),
    }))
    .sort((a, b) => a.base.localeCompare(b.base, "pt-BR", { sensitivity: "base" }));
}

const mesesDe = (s: Serie) => new Set(s.itens.map((l) => dataQueVale(l).slice(0, 7)));

/** Palavras que não ajudam a dizer se dois nomes são a mesma conta. */
const SEM_PESO = new Set(["das", "dos", "com", "para", "por", "sem", "ref", "que", "uma"]);

function palavras(nome: string): string[] {
  return [
    ...new Set(
      nome
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((p) => p.length >= 3 && !SEM_PESO.has(p)),
    ),
  ];
}

/**
 * Os dois nomes descrevem a mesma conta?
 *
 * Mais da metade das palavras do nome mais curto precisa aparecer no outro.
 * Prefixo vale, porque o dono abrevia: "Tânia Neuro" e "Tânia
 * neuropsipedagoga". Só valor igual não basta — R$ 80,00 é o guarda da rua
 * e é a Sabesp, e "Celular Eloah" e "Celular Rapha" são duas linhas.
 */
export function nomesParecidos(a: string, b: string): boolean {
  const pa = palavras(a);
  const pb = palavras(b);
  const [curto, longo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  if (curto.length === 0) return false;
  const bate = (p: string) => longo.some((q) => q.startsWith(p) || p.startsWith(q));
  return curto.filter(bate).length * 2 > curto.length;
}

/**
 * Séries que parecem a mesma conta cadastrada duas vezes: mesmo tipo, mesmo
 * valor, pelo menos dois meses em comum e nomes parecidos. Gerar a
 * recorrência de novo, com outro nome ou outro dia, dobra a despesa sem que
 * nada na tela avise.
 */
export function possiveisRepetidas(series: Serie[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const a = series[i];
      const b = series[j];
      if (a.tipo !== b.tipo) continue;
      if (a.itens[0].valor.toFixed(2) !== b.itens[0].valor.toFixed(2)) continue;
      if (!nomesParecidos(a.base, b.base)) continue;
      const ma = mesesDe(a);
      let comuns = 0;
      for (const m of mesesDe(b)) if (ma.has(m)) comuns += 1;
      if (comuns < 2) continue;
      out.set(a.chave, [...(out.get(a.chave) ?? []), b.base]);
      out.set(b.chave, [...(out.get(b.chave) ?? []), a.base]);
    }
  }
  return out;
}

export type SerieResumida = {
  chave: string;
  base: string;
  tipo: TipoLancamento;
  vinculada: boolean;
  quantidade: number;
  pendentes: number;
  /** `null` quando os lançamentos da série têm valores diferentes. */
  valor: number | null;
  primeira: string;
  ultima: string;
  onde: string | null;
};

/**
 * As séries que não estão na lista principal de contas recorrentes — em
 * geral, as já quitadas.
 *
 * A lista principal é para corrigir o que ainda vai vencer, e por isso só
 * tem séries com pendência. Mas a busca precisa achar as outras também: uma
 * mensalidade toda paga sumindo da busca parece conta apagada.
 */
export function outrasSeries(
  todos: LancamentoNaLista[],
  jaListadas: Set<string>,
): SerieResumida[] {
  return agruparSeries(todos)
    .filter((s) => !jaListadas.has(s.chave))
    // Sem vínculo de série, o agrupamento é só pelo nome e pelo valor — e aí
    // duas compras iguais no mesmo mês (em geral, um lançamento importado duas
    // vezes) viravam "série". Conta recorrente aparece em meses diferentes.
    .filter((s) => s.vinculada || new Set(s.itens.map((l) => dataQueVale(l).slice(0, 7))).size >= 2)
    .map((s) => {
      const valores = new Set(s.itens.map((l) => l.valor.toFixed(2)));
      return {
        chave: s.chave,
        base: s.base,
        tipo: s.tipo,
        vinculada: s.vinculada,
        quantidade: s.itens.length,
        pendentes: s.itens.filter((l) => l.situacao === "a_pagar" || l.situacao === "a_receber")
          .length,
        valor: valores.size === 1 ? s.itens[0].valor : null,
        primeira: dataQueVale(s.itens[0]),
        ultima: dataQueVale(s.itens[s.itens.length - 1]),
        onde: s.onde,
      };
    });
}
