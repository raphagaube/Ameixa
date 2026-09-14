import * as XLSX from "xlsx";
import type { LinhaCru } from "@/lib/csv";
import { lerExcel } from "@/lib/excel";

/**
 * A planilha do Ameixa lida de volta, com os códigos.
 *
 * Os lançamentos vêm como texto cru, pelo mesmo `lerExcel` da importação
 * comum — assim datas e valores são entendidos exatamente do mesmo jeito.
 */
export type PlanilhaDoAmeixa = {
  lancamentos: { linha: number; codigo: string; cru: LinhaCru }[];
  categorias: {
    linha: number;
    codigo: string;
    tipo: string;
    categoria: string;
    subcategoria: string;
  }[];
  contas: { linha: number; codigo: string; nome: string }[];
};

const normalizar = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const texto = (v: unknown) => String(v ?? "").trim();

function linhasDaAba(pasta: XLSX.WorkBook, nome: string): unknown[][] {
  const real = pasta.SheetNames.find((n) => normalizar(n) === normalizar(nome));
  if (!real) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(pasta.Sheets[real], {
    header: 1,
    blankrows: false,
    defval: "",
  });
}

/**
 * Devolve `null` quando o arquivo não é uma planilha do Ameixa com códigos
 * — uma planilha qualquer, ou uma exportada antes de os códigos existirem.
 * Nesses casos vale a importação comum, que só cria lançamentos.
 */
export function lerPlanilhaDoAmeixa(dados: ArrayBuffer): PlanilhaDoAmeixa | null {
  const pasta = XLSX.read(dados, { type: "array", cellDates: true });

  const cabecalho = ((linhasDaAba(pasta, "Lançamentos")[0] ?? []) as unknown[]).map(normalizar);
  if (!cabecalho.includes("codigo")) return null;

  const lancamentos = lerExcel(dados).map((cru, i) => ({
    linha: i + 2,
    codigo: texto(cru["codigo"]),
    cru,
  }));

  const cats = linhasDaAba(pasta, "Categorias");
  const hc = ((cats[0] ?? []) as unknown[]).map(normalizar);
  const [iTipo, iCat, iSub, iCodC] = ["tipo", "categoria", "subcategoria", "codigo"].map((c) =>
    hc.indexOf(c),
  );
  const categorias =
    iCodC < 0 || iCat < 0
      ? []
      : cats
          .slice(1)
          .map((r, i) => ({
            linha: i + 2,
            codigo: texto(r[iCodC]),
            tipo: iTipo < 0 ? "" : texto(r[iTipo]),
            categoria: texto(r[iCat]),
            subcategoria: iSub < 0 ? "" : texto(r[iSub]),
          }))
          .filter((r) => r.codigo);

  const cts = linhasDaAba(pasta, "Contas");
  const hk = ((cts[0] ?? []) as unknown[]).map(normalizar);
  const iConta = hk.indexOf("conta");
  const iCodK = hk.indexOf("codigo");
  const contas =
    iCodK < 0 || iConta < 0
      ? []
      : cts
          .slice(1)
          .map((r, i) => ({ linha: i + 2, codigo: texto(r[iCodK]), nome: texto(r[iConta]) }))
          .filter((r) => r.codigo);

  return { lancamentos, categorias, contas };
}
