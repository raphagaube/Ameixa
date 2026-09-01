/**
 * Leitura de OFX/QFX e casamento com os lançamentos do app.
 *
 * O OFX é um formato de tags que nem sempre fecha as tags, então parsear
 * como XML não funciona com arquivo de banco de verdade. Aqui é regex sobre
 * os blocos STMTTRN, que é o que o handoff recomenda.
 */

export type MovimentoOfx = {
  fitid: string;
  data: string;
  valor: number;
  descricao: string;
  /** true quando o extrato mostra saída de dinheiro */
  saida: boolean;
};

/** Pega o conteúdo de uma tag até a próxima tag ou quebra de linha. */
function tag(bloco: string, nome: string): string | null {
  const m = bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : null;
}

/** DTPOSTED vem como aaaammdd, às vezes com hora e fuso colados. */
export function dataOfx(bruto: string): string | null {
  const m = bruto.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, a, mes, d] = m;
  const mn = Number(mes);
  const dn = Number(d);
  if (mn < 1 || mn > 12 || dn < 1 || dn > 31) return null;
  return `${a}-${mes}-${d}`;
}

export function lerOfx(texto: string): MovimentoOfx[] {
  const blocos = texto.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const movimentos: MovimentoOfx[] = [];

  for (const b of blocos) {
    const dtRaw = tag(b, "DTPOSTED");
    const valorRaw = tag(b, "TRNAMT");
    if (!dtRaw || !valorRaw) continue;

    const data = dataOfx(dtRaw);
    if (!data) continue;

    // Bancos brasileiros às vezes mandam vírgula decimal.
    const bruto = Number(valorRaw.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(bruto) || bruto === 0) continue;

    const descricao =
      tag(b, "MEMO") ?? tag(b, "NAME") ?? "Movimento sem descrição";

    movimentos.push({
      // Sem FITID, monta uma chave estável com o que existe — senão a
      // reimportação do mesmo arquivo duplicaria tudo.
      fitid: tag(b, "FITID") ?? `${data}|${bruto}|${descricao}`,
      data,
      valor: Math.abs(bruto),
      descricao,
      saida: bruto < 0,
    });
  }

  return movimentos;
}

export type Classificacao = "confere" | "provavel" | "novo" | "ja_conciliado";

export const ROTULO_CLASSIFICACAO: Record<Classificacao, string> = {
  confere: "Confere",
  provavel: "Provável",
  novo: "Novo no banco",
  ja_conciliado: "Já conciliado",
};

export type LancamentoParaCasar = {
  id: string;
  valor: number;
  data: string;
  descricao: string;
  fitid: string | null;
};

export type Sugestao = {
  movimento: MovimentoOfx;
  classificacao: Classificacao;
  lancamentoId: string | null;
  distanciaDias: number | null;
};

function diasEntre(a: string, b: string): number {
  const d1 = new Date(`${a}T00:00:00`);
  const d2 = new Date(`${b}T00:00:00`);
  return Math.abs(Math.round((d1.getTime() - d2.getTime()) / 86400000));
}

export const TOLERANCIA_DIAS = 3;

/**
 * Regra 8 do modelo de dados: casa por mesmo valor absoluto e data até 3
 * dias de distância, sem reaproveitar um lançamento já casado na mesma
 * importação. O `fitid` já existente marca como "já conciliado" e nada
 * é recriado.
 */
export function casar(
  movimentos: MovimentoOfx[],
  lancamentos: LancamentoParaCasar[],
): Sugestao[] {
  const fitidsExistentes = new Set(
    lancamentos.map((l) => l.fitid).filter((f): f is string => !!f),
  );
  const usados = new Set<string>();

  return movimentos.map((mov) => {
    if (fitidsExistentes.has(mov.fitid)) {
      const dono = lancamentos.find((l) => l.fitid === mov.fitid);
      return {
        movimento: mov,
        classificacao: "ja_conciliado" as const,
        lancamentoId: dono?.id ?? null,
        distanciaDias: 0,
      };
    }

    const candidatos = lancamentos
      .filter(
        (l) =>
          !usados.has(l.id) &&
          !l.fitid &&
          Math.abs(l.valor - mov.valor) < 0.005 &&
          diasEntre(l.data, mov.data) <= TOLERANCIA_DIAS,
      )
      .sort((a, b) => diasEntre(a.data, mov.data) - diasEntre(b.data, mov.data));

    const escolhido = candidatos[0];
    if (!escolhido) {
      return {
        movimento: mov,
        classificacao: "novo" as const,
        lancamentoId: null,
        distanciaDias: null,
      };
    }

    usados.add(escolhido.id);
    const dist = diasEntre(escolhido.data, mov.data);

    return {
      movimento: mov,
      classificacao: dist === 0 ? ("confere" as const) : ("provavel" as const),
      lancamentoId: escolhido.id,
      distanciaDias: dist,
    };
  });
}

/** Lançamentos do período que o extrato não trouxe. */
export function soNoApp(
  lancamentos: LancamentoParaCasar[],
  sugestoes: Sugestao[],
): LancamentoParaCasar[] {
  const casados = new Set(
    sugestoes.map((s) => s.lancamentoId).filter((id): id is string => !!id),
  );
  return lancamentos.filter((l) => !casados.has(l.id));
}
