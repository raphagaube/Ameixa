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
