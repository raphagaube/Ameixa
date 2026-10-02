/**
 * Cópias de importação: o mesmo lançamento gravado de novo por uma planilha.
 *
 * Importar de volta a planilha exportada pelo próprio app cria tudo outra
 * vez. O resultado são pares idênticos — mesmo tipo, data, valor e descrição
 * — em que um já existia e o outro chegou depois, numa importação. É isso
 * que esta função procura.
 *
 * O que ela NÃO faz é decidir por dois lançamentos iguais que nasceram
 * juntos: dois cafés de R$ 5,00 no mesmo dia são dois gastos de verdade.
 * Esses vão para uma segunda lista, para o dono conferir.
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
};

/** A cópia sai; o original fica. */
export type Copia<T> = { copia: T; original: T };

/** Iguais que a regra não decide sozinha: `manter` fica, `iguais` o dono julga. */
export type ParaConferir<T> = { manter: T; iguais: T[] };

/**
 * Gravados com até dez minutos de diferença são do mesmo lote. Uma
 * importação grava milhares de linhas em segundos; duas importações são
 * separadas por horas ou dias.
 */
const JANELA_DO_LOTE = 10 * 60 * 1000;

export function acharCopias<T extends ParaCopias>(
  lancamentos: T[],
): { copias: Copia<T>[]; paraConferir: ParaConferir<T>[] } {
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
  const paraConferir: ParaConferir<T>[] = [];
  const quando = (l: T) => Date.parse(l.criado_em);

  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const ordem = [...grupo].sort((a, b) => quando(a) - quando(b) || a.id.localeCompare(b.id));

    // O primeiro lote são os originais. Mais de um original igual não é
    // decidido aqui: nasceram juntos, podem ser dois gastos de verdade.
    const inicio = quando(ordem[0]);
    const originais = ordem.filter((l) => quando(l) - inicio <= JANELA_DO_LOTE);
    const iguais: T[] = originais.slice(1);

    // Cada lote posterior é uma nova gravação do mesmo conteúdo. É cópia o
    // que veio de importação, um para um com os originais; o que passar
    // disso, ou tiver sido lançado à mão, fica para o dono conferir.
    let lote: T[] = [];
    let inicioDoLote = 0;
    const fechar = () => {
      let pares = 0;
      for (const l of lote) {
        if (l.importado && pares < originais.length) {
          copias.push({ copia: l, original: originais[pares] });
          pares += 1;
        } else {
          iguais.push(l);
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

    if (iguais.length > 0) paraConferir.push({ manter: ordem[0], iguais });
  }

  const porData = (a: T, b: T) =>
    a.data_registro.localeCompare(b.data_registro) || a.descricao.localeCompare(b.descricao);
  copias.sort((a, b) => porData(a.copia, b.copia));
  paraConferir.sort((a, b) => porData(a.manter, b.manter));
  return { copias, paraConferir };
}
