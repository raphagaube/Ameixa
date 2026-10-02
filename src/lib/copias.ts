import { nomesParecidos, numeroDaParcela, separarSufixo } from "@/lib/recorrentes";

/**
 * Cópias de importação: o mesmo lançamento gravado de novo por uma planilha.
 *
 * Importar de volta a planilha exportada pelo próprio app cria tudo outra
 * vez. O resultado são pares idênticos — mesmo tipo, data, valor e descrição
 * — em que um já existia e o outro chegou depois, numa importação. É isso
 * que esta função procura.
 *
 * Duas coisas ela NÃO decide sozinha, e manda para o dono conferir:
 *
 * - iguais que nasceram juntos: dois cafés de R$ 5,00 no mesmo dia são dois
 *   gastos de verdade;
 * - par que deixou de ser idêntico nos detalhes (situação, vencimento,
 *   categoria, conta): um dos dois foi editado depois, e excluir a cópia
 *   poderia jogar fora justamente a correção.
 */

export type ParaCopias = {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  /** aaaa-mm-dd */
  data_registro: string;
  /** aaaa-mm-dd, quando a conta tem vencimento. */
  data_vencimento?: string | null;
  importado: boolean;
  /** Instante em que o lançamento foi gravado. */
  criado_em: string;
  /**
   * O que mais precisa ser igual para a cópia sair sem perguntar. A chave é
   * o nome do campo como aparece na tela ("situação", "vencimento").
   */
  detalhes?: Record<string, string | null>;
};

/** A cópia sai; o original fica. */
export type Copia<T> = { copia: T; original: T };

/** Igual a `manter`, mas a regra não decide sozinha; o dono julga. */
export type Conferir<T> = {
  item: T;
  manter: T;
  /** Detalhes em que difere de `manter`; vazio quando é idêntico. */
  difere: string[];
};

/**
 * Gravados com até dez minutos de diferença são do mesmo lote. Uma
 * importação grava milhares de linhas em segundos; duas importações são
 * separadas por horas ou dias.
 */
const JANELA_DO_LOTE = 10 * 60 * 1000;

function diferencas(a: ParaCopias, b: ParaCopias): string[] {
  const da = a.detalhes ?? {};
  const db = b.detalhes ?? {};
  return [...new Set([...Object.keys(da), ...Object.keys(db)])].filter(
    (k) => (da[k] ?? null) !== (db[k] ?? null),
  );
}

export function acharCopias<T extends ParaCopias>(
  lancamentos: T[],
): { copias: Copia<T>[]; paraConferir: Conferir<T>[] } {
  const grupos = new Map<string, T[]>();
  for (const l of lancamentos) {
    // Aporte em meta não é despesa nem receita, e não entra nesta limpeza.
    if (l.tipo !== "receita" && l.tipo !== "despesa") continue;
    const chave = [
      l.tipo,
      l.data_registro.slice(0, 10),
      l.valor.toFixed(2),
      l.descricao.trim().toLowerCase(),
    ].join("|");
    const grupo = grupos.get(chave);
    if (grupo) grupo.push(l);
    else grupos.set(chave, [l]);
  }

  const copias: Copia<T>[] = [];
  const paraConferir: Conferir<T>[] = [];
  const quando = (l: T) => Date.parse(l.criado_em);

  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const ordem = [...grupo].sort((a, b) => quando(a) - quando(b) || a.id.localeCompare(b.id));

    // O primeiro lote são os originais. Mais de um original igual não é
    // decidido aqui: nasceram juntos, podem ser dois gastos de verdade.
    const inicio = quando(ordem[0]);
    const originais = ordem.filter((l) => quando(l) - inicio <= JANELA_DO_LOTE);
    for (const o of originais.slice(1)) {
      paraConferir.push({ item: o, manter: originais[0], difere: diferencas(o, originais[0]) });
    }

    // Cada lote posterior é uma nova gravação do mesmo conteúdo. É cópia o
    // que veio de importação e continua idêntico a um original nos detalhes,
    // um para um. O resto fica para o dono conferir.
    let lote: T[] = [];
    let inicioDoLote = 0;
    const fechar = () => {
      const livres = [...originais];
      for (const l of lote) {
        const par = l.importado ? livres.findIndex((o) => diferencas(l, o).length === 0) : -1;
        if (par >= 0) {
          copias.push({ copia: l, original: livres[par] });
          livres.splice(par, 1);
        } else {
          const manter = livres[0] ?? originais[0];
          paraConferir.push({ item: l, manter, difere: diferencas(l, manter) });
        }
      }
      lote = [];
    };
    for (const l of ordem.slice(originais.length)) {
      if (lote.length > 0 && quando(l) - inicioDoLote > JANELA_DO_LOTE) fechar();
      if (lote.length === 0) inicioDoLote = quando(l);
      lote.push(l);
    }
    if (lote.length > 0) fechar();
  }

  const porData = (a: T, b: T) =>
    a.data_registro.localeCompare(b.data_registro) || a.descricao.localeCompare(b.descricao);
  copias.sort((a, b) => porData(a.copia, b.copia));
  paraConferir.sort((a, b) => porData(a.item, b.item));
  return { copias, paraConferir };
}

export type ClasseDoGrupo = "igual" | "parecido" | "diferente";

export type GrupoParecido<T> = {
  /** O quanto os nomes se parecem; quanto mais igual, mais provável a repetição. */
  classe: ClasseDoGrupo;
  tipo: string;
  /** A data que juntou o grupo: o vencimento, ou o registro de quem não tem. */
  data: string;
  /** Algum item do grupo tem vencimento — a data acima é "vence em". */
  peloVencimento: boolean;
  valor: number;
  itens: T[];
};

const ORDEM_DA_CLASSE: Record<ClasseDoGrupo, number> = { igual: 0, parecido: 1, diferente: 2 };

/**
 * A mesma conta lançada duas vezes com nomes diferentes.
 *
 * O dono repete a conta recorrente mudando só o vencimento, então mesmo nome
 * e mesmo valor com vencimentos diferentes são meses diferentes — não entram
 * aqui. Repetição é o contrário: MESMO vencimento e mesmo valor, com o nome
 * igual ou parecido ("Candeias Ubatuba" e "Candeias Ubatuba — 3/10", a mesma
 * parcela em duas séries).
 *
 * Nada daqui sai marcado. "Jiu-Jitsu - Eloah" e "Jiu-Jitsu - Rapha" vencem no
 * mesmo dia, custam o mesmo e têm nomes parecidos, e são duas mensalidades:
 * só o dono sabe dizer.
 *
 * Parcelas de números diferentes ("(1/9)" e "(2/9)") nunca se juntam: é a
 * mesma compra dividida, não a mesma parcela repetida.
 */
export function acharParecidos<T extends ParaCopias>(
  lancamentos: T[],
  ignorar: ReadonlySet<string> = new Set(),
): GrupoParecido<T>[] {
  const porChave = new Map<string, T[]>();
  for (const l of lancamentos) {
    if (ignorar.has(l.id)) continue;
    if (l.tipo !== "receita" && l.tipo !== "despesa") continue;
    const data = (l.data_vencimento ?? l.data_registro).slice(0, 10);
    const chave = [l.tipo, data, l.valor.toFixed(2)].join("|");
    const grupo = porChave.get(chave);
    if (grupo) grupo.push(l);
    else porChave.set(chave, [l]);
  }

  const grupos: GrupoParecido<T>[] = [];

  for (const itens of porChave.values()) {
    if (itens.length < 2) continue;

    const base = itens.map((l) => separarSufixo(l.descricao).base.trim().toLowerCase());
    const parcela = itens.map((l) => numeroDaParcela(l.descricao));
    const outraParcela = (a: number, b: number) =>
      parcela[a] !== null && parcela[b] !== null && parcela[a] !== parcela[b];

    // Junta em blocos quem tem nome igual ou parecido.
    const pai = itens.map((_, i) => i);
    const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
    for (let a = 0; a < itens.length; a++) {
      for (let b = a + 1; b < itens.length; b++) {
        if (outraParcela(a, b)) continue;
        if (base[a] === base[b] || nomesParecidos(base[a], base[b])) pai[raiz(a)] = raiz(b);
      }
    }
    const blocos = new Map<number, number[]>();
    itens.forEach((_, i) => blocos.set(raiz(i), [...(blocos.get(raiz(i)) ?? []), i]));

    const montar = (classe: ClasseDoGrupo, indices: number[]): GrupoParecido<T> => {
      const doGrupo = indices
        .map((i) => itens[i])
        .sort((a, b) => Date.parse(a.criado_em) - Date.parse(b.criado_em) || a.id.localeCompare(b.id));
      return {
        classe,
        tipo: doGrupo[0].tipo,
        data: (doGrupo[0].data_vencimento ?? doGrupo[0].data_registro).slice(0, 10),
        peloVencimento: doGrupo.some((l) => !!l.data_vencimento),
        valor: doGrupo[0].valor,
        itens: doGrupo,
      };
    };

    const soltos: number[] = [];
    for (const indices of blocos.values()) {
      if (indices.length < 2) {
        soltos.push(indices[0]);
        continue;
      }
      const nomes = new Set(indices.map((i) => itens[i].descricao.trim().toLowerCase()));
      grupos.push(montar(nomes.size === 1 ? "igual" : "parecido", indices));
    }

    // Mesmo vencimento e valor com nomes sem nada em comum: pode ser a mesma
    // conta com outro apelido ("Anhanguera" e "Facu Rapha"), pode ser
    // coincidência. Vai por último, e só se não for a mesma compra parcelada.
    const algumParSemParcela = soltos.some((a, i) => soltos.slice(i + 1).some((b) => !outraParcela(a, b)));
    if (soltos.length >= 2 && algumParSemParcela) grupos.push(montar("diferente", soltos));
  }

  return grupos.sort(
    (a, b) =>
      ORDEM_DA_CLASSE[a.classe] - ORDEM_DA_CLASSE[b.classe] ||
      a.data.localeCompare(b.data) ||
      a.valor - b.valor,
  );
}
