import { describe, expect, it } from "vitest";
import { montarBackup, TABELAS_DO_BACKUP, type PaginaDoBackup, type TabelaDoBackup } from "./backup";

/** Um servidor de mentira: mil linhas por página, como o de verdade. */
function servidor(tamanhos: Partial<Record<TabelaDoBackup, number>>) {
  const pedidos: string[] = [];
  const buscar = async (tabela: TabelaDoBackup, pagina: number): Promise<PaginaDoBackup> => {
    pedidos.push(`${tabela}:${pagina}`);
    const total = tamanhos[tabela] ?? 0;
    const de = pagina * 1000;
    const linhas = Array.from({ length: Math.max(0, Math.min(1000, total - de)) }, (_, i) => ({
      id: `${tabela}-${de + i}`,
    }));
    return { ok: true, linhas, total };
  };
  return { buscar, pedidos };
}

describe("montarBackup", () => {
  it("traz todos os lançamentos, não só os mil primeiros", async () => {
    const { buscar, pedidos } = servidor({ lancamentos: 2322, categorias: 30 });
    const r = await montarBackup(buscar);
    if (!r.ok) throw new Error(r.erro);

    const lancamentos = r.dados.lancamentos as { id: string }[];
    expect(lancamentos).toHaveLength(2322);
    expect(lancamentos[2321].id).toBe("lancamentos-2321");
    expect(new Set(lancamentos.map((l) => l.id)).size).toBe(2322);
    expect(pedidos.filter((p) => p.startsWith("lancamentos:"))).toEqual([
      "lancamentos:0",
      "lancamentos:1",
      "lancamentos:2",
    ]);
  });

  it("traz todas as tabelas e registra a contagem de cada uma", async () => {
    const { buscar } = servidor({ lancamentos: 5, contas: 3 });
    const r = await montarBackup(buscar);
    if (!r.ok) throw new Error(r.erro);

    for (const t of TABELAS_DO_BACKUP) expect(Array.isArray(r.dados[t])).toBe(true);
    expect(r.dados.contagem).toMatchObject({ lancamentos: 5, contas: 3, metas: 0 });
    expect(r.dados.versao).toBe(1);
  });

  it("múltiplo exato de mil não pede página além do fim", async () => {
    const { buscar, pedidos } = servidor({ lancamentos: 2000 });
    const r = await montarBackup(buscar);
    expect(r.ok).toBe(true);
    expect(pedidos.filter((p) => p.startsWith("lancamentos:"))).toHaveLength(2);
  });

  it("falha numa página derruba o backup inteiro, em vez de entregar pela metade", async () => {
    const { buscar } = servidor({ lancamentos: 2322 });
    const r = await montarBackup(async (tabela, pagina) =>
      tabela === "lancamentos" && pagina === 1
        ? { ok: false, erro: "Não deu para exportar lançamentos. Tente de novo." }
        : buscar(tabela, pagina),
    );
    expect(r).toEqual({ ok: false, erro: "Não deu para exportar lançamentos. Tente de novo." });
  });

  it("contagem que não fecha é erro — o caso do corte silencioso em mil", async () => {
    // O servidor diz que há 2322, mas entrega mil e para.
    const r = await montarBackup(async (tabela, pagina) => {
      if (tabela !== "lancamentos") return { ok: true, linhas: [], total: 0 };
      return {
        ok: true,
        linhas: pagina === 0 ? Array.from({ length: 1000 }, (_, i) => ({ id: i })) : [],
        total: 2322,
      };
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("1000 de 2322");
  });

  it("avisa o progresso a cada página", async () => {
    const { buscar } = servidor({ lancamentos: 2322 });
    const passos: string[] = [];
    await montarBackup(buscar, (t, lidas, total) => {
      if (t === "lancamentos") passos.push(`${lidas}/${total}`);
    });
    expect(passos).toEqual(["1000/2322", "2000/2322", "2322/2322"]);
  });
});
