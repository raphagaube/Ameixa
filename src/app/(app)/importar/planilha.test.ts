import { beforeEach, describe, expect, it, vi } from "vitest";
const consulta = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dados/lancamentos", () => ({ lancamentosParaPlanilha: consulta }));
import { buscarExtratoParaPlanilha } from "./planilha";

beforeEach(() => { vi.clearAllMocks(); consulta.mockResolvedValue([]); });
describe("exportação pelo Extrato", () => {
  it("aplica o período e todos os filtros, inclusive a data pelo vencimento", async () => {
    await buscarExtratoParaPlanilha({ periodo: "faixa", de: "2026-09-01", ate: "2026-10-10", datas: "vencimento", ordem: "maior", texto: "Mercado", categoria: "cat", subcategoria: "sub", situacao: "a_pagar", forma: "Pix", responsavel: "Raphael" });
    expect(consulta).toHaveBeenCalledWith({ de: "2026-09-01", ate: "2026-10-10", datasPor: "vencimento", ordem: "maior", texto: "Mercado", categoriaId: "cat", subcategoriaId: "sub", situacao: "a_pagar", forma: "Pix", responsavel: "Raphael" });
  });
  it("expõe falha de leitura em vez de oferecer um arquivo incompleto", async () => {
    consulta.mockResolvedValue(null);
    expect(await buscarExtratoParaPlanilha({})).toMatchObject({ ok: false });
  });
  it("recusa parâmetros que não são texto", async () => {
    expect(await buscarExtratoParaPlanilha({ texto: 123 } as never)).toMatchObject({ ok: false });
    expect(consulta).not.toHaveBeenCalled();
  });
});
