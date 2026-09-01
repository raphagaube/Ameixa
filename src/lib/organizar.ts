/**
 * Organização em lote das pendências vindas de importação.
 *
 * Quando a planilha tem categorias próprias que o app não conhece, o
 * lançamento entra sem categoria. Tentar encaixar "REFEIÇÕES FORA" em
 * "Alimentação" seria adivinhação; o certo é criar a categoria do usuário.
 *
 * O nome original fica guardado na observação, no último trecho separado
 * por " · " — é de lá que este módulo recupera a intenção.
 */

export type GrupoPendencia = {
  /** Nome como veio da planilha, já sem a explicação entre parênteses. */
  nome: string;
  /** Texto completo original, para mostrar ao usuário. */
  original: string;
  tipo: "despesa" | "receita";
  ids: string[];
  soma: number;
};

const SEPARADOR = " · ";

/**
 * Recupera o nome da categoria guardado na observação.
 *
 * O assistente grava a observação como "algo · CATEGORIA DA PLANILHA",
 * então o último trecho é o que interessa. Sem separador, a observação
 * inteira é o candidato.
 */
export function extrairCategoriaOriginal(observacao: string | null): string | null {
  if (!observacao) return null;
  const partes = observacao.split(SEPARADOR).map((p) => p.trim()).filter(Boolean);
  if (partes.length === 0) return null;
  return partes[partes.length - 1];
}

/** Tira a explicação entre parênteses e normaliza para comparar. */
export function nomeCurto(bruto: string): string {
  return bruto.split("(")[0].trim();
}

export function chaveDeComparacao(bruto: string): string {
  return nomeCurto(bruto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export type PendenciaCrua = {
  id: string;
  tipo: "despesa" | "receita" | "aporte";
  valor: number;
  observacao: string | null;
};

/**
 * Agrupa as pendências pela categoria que vinha na planilha.
 *
 * Despesa e receita ficam em grupos separados mesmo com o mesmo nome: uma
 * categoria no app é de um tipo só.
 */
export function agruparPorCategoriaOriginal(
  pendencias: PendenciaCrua[],
): GrupoPendencia[] {
  const mapa = new Map<string, GrupoPendencia>();

  for (const p of pendencias) {
    if (p.tipo === "aporte") continue;
    const original = extrairCategoriaOriginal(p.observacao);
    if (!original) continue;

    const nome = nomeCurto(original);
    if (!nome) continue;

    const chave = `${p.tipo}|${chaveDeComparacao(original)}`;
    const atual = mapa.get(chave);

    if (atual) {
      atual.ids.push(p.id);
      atual.soma += p.valor;
    } else {
      mapa.set(chave, {
        nome,
        original,
        tipo: p.tipo,
        ids: [p.id],
        soma: p.valor,
      });
    }
  }

  return [...mapa.values()].sort((a, b) => b.ids.length - a.ids.length);
}

/** Procura uma categoria já existente no app com o mesmo nome. */
export function categoriaExistente(
  nome: string,
  tipo: "despesa" | "receita",
  categorias: { id: string; nome: string; tipo: "despesa" | "receita" }[],
): string | null {
  const alvo = chaveDeComparacao(nome);
  const achada = categorias.find(
    (c) => c.tipo === tipo && chaveDeComparacao(c.nome) === alvo,
  );
  return achada?.id ?? null;
}

/**
 * Cor para uma categoria nova, tirada de uma roda de tons distintos.
 * Usar o índice do grupo mantém cores diferentes entre categorias vizinhas.
 */
const CORES_NOVAS = [
  "#8FB3D9",
  "#E9A28E",
  "#A9A0D8",
  "#8FCFC4",
  "#E7A8C4",
  "#E3C879",
  "#BDA8E0",
  "#8FC9E0",
  "#9FC58F",
  "#D9A88F",
  "#8FA8CF",
  "#CFA8B8",
];

export function corParaNova(indice: number): string {
  return CORES_NOVAS[indice % CORES_NOVAS.length];
}
