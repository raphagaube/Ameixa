import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

/**
 * Agrupa lançamentos com o mesmo valor E a mesma descrição.
 *
 * Serve para achar duplicata de importação ou dedo pesado no salvar. Parcelas
 * e assinaturas ficam de fora porque a numeração ("3/10") já muda a descrição
 * — e mesmo se não mudasse, série não é duplicata.
 */

export type GrupoRepetido = {
  chave: string;
  descricao: string;
  valor: number;
  ocorrencias: LancamentoNaLista[];
};

export function agruparRepetidos(
  lancamentos: LancamentoNaLista[],
): GrupoRepetido[] {
  const mapa = new Map<string, GrupoRepetido>();

  for (const l of lancamentos) {
    if (l.serie_id) continue;
    const chave = `${l.descricao.trim().toLowerCase()}|${l.valor.toFixed(2)}`;
    const atual = mapa.get(chave);
    if (atual) atual.ocorrencias.push(l);
    else
      mapa.set(chave, {
        chave,
        descricao: l.descricao,
        valor: l.valor,
        ocorrencias: [l],
      });
  }

  return [...mapa.values()]
    .filter((g) => g.ocorrencias.length > 1)
    .map((g) => ({
      ...g,
      ocorrencias: [...g.ocorrencias].sort((a, b) =>
        a.data_registro.localeCompare(b.data_registro),
      ),
    }))
    .sort((a, b) => b.ocorrencias.length - a.ocorrencias.length);
}

/** "Mesclar" marca todas menos a primeira para exclusão. */
export function idsParaMesclar(grupo: GrupoRepetido): string[] {
  return grupo.ocorrencias.slice(1).map((o) => o.id);
}
