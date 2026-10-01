import { describe, expect, it } from "vitest";
import { lerTudo, PAGINA } from "./paginas";

/** Um "banco" de mentira que, como o Supabase, nunca devolve mais de mil. */
function banco(total: number) {
  const linhas = Array.from({ length: total }, (_, i) => i);
  const pedidos: [number, number][] = [];
  const consulta = async (de: number, ate: number) => {
    pedidos.push([de, ate]);
    return { data: linhas.slice(de, Math.min(ate + 1, de + PAGINA)), error: null };
  };
  return { consulta, pedidos };
}

describe("lerTudo", () => {
  it("lê tudo quando há mais de mil linhas — o caso que o Supabase cortava", async () => {
    const { consulta, pedidos } = banco(2322);
    const r = await lerTudo(consulta);
    expect(r).toHaveLength(2322);
    expect(r![0]).toBe(0);
    expect(r![2321]).toBe(2321);
    expect(pedidos).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("com menos de mil, uma consulta só", async () => {
    const { consulta, pedidos } = banco(121);
    expect(await lerTudo(consulta)).toHaveLength(121);
    expect(pedidos).toHaveLength(1);
  });

  it("múltiplo exato de mil pede uma página a mais para ter certeza de que acabou", async () => {
    const { consulta, pedidos } = banco(2000);
    expect(await lerTudo(consulta)).toHaveLength(2000);
    expect(pedidos).toHaveLength(3);
  });

  it("tabela vazia devolve lista vazia, não nulo", async () => {
    expect(await lerTudo(banco(0).consulta)).toEqual([]);
  });

  it("respeita o teto e não pede além dele", async () => {
    const { consulta, pedidos } = banco(9000);
    expect(await lerTudo(consulta, 2500)).toHaveLength(2500);
    expect(pedidos).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2499],
    ]);
  });

  it("teto menor que uma página (o extrato da tela pede 500)", async () => {
    const { consulta, pedidos } = banco(9000);
    expect(await lerTudo(consulta, 500)).toHaveLength(500);
    expect(pedidos).toEqual([[0, 499]]);
  });

  it("erro numa página devolve nulo, nunca a lista pela metade", async () => {
    let chamadas = 0;
    const r = await lerTudo(async (de: number, ate: number) => {
      chamadas += 1;
      if (chamadas === 2) return { data: null, error: new Error("caiu") };
      return { data: Array.from({ length: ate - de + 1 }, (_, i) => de + i), error: null };
    });
    expect(r).toBeNull();
  });
});
