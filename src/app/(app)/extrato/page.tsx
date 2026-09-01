import { paraIso } from "@/lib/formato";
import { categoriasDoUsuario } from "@/lib/dados/categorias";
import {
  lancamentosDoPeriodo,
  limitesDoMes,
  type Ordem,
} from "@/lib/dados/lancamentos";
import { PainelExtrato } from "./painel-extrato";

export const metadata = { title: "Extrato · Ameixa" };

export type Periodo = "dia" | "mes" | "ano" | "faixa";

function intervalo(
  periodo: Periodo,
  ano: number,
  mes: number,
  dia: number,
  de?: string,
  ate?: string,
) {
  if (periodo === "dia") {
    const d = paraIso(new Date(ano, mes, dia));
    return { de: d, ate: d };
  }
  if (periodo === "ano") {
    return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
  }
  if (periodo === "faixa" && de && ate) {
    // Datas invertidas não podem devolver lista vazia sem explicação.
    return de <= ate ? { de, ate } : { de: ate, ate: de };
  }
  return limitesDoMes(ano, mes);
}

export default async function Extrato({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const hoje = new Date();

  const periodo = (p.periodo as Periodo) ?? "mes";
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();
  const dia = Number(p.dia) || hoje.getDate();
  const ordem = (p.ordem as Ordem) ?? "recentes";

  const { de, ate } = intervalo(periodo, ano, mes, dia, p.de, p.ate);

  const [lancamentos, categorias] = await Promise.all([
    lancamentosDoPeriodo({
      de,
      ate,
      texto: p.texto || undefined,
      categoriaId: p.categoria || undefined,
      subcategoriaId: p.subcategoria || undefined,
      situacao: p.situacao || undefined,
      forma: p.forma || undefined,
      responsavel: p.responsavel || undefined,
      ordem,
    }),
    categoriasDoUsuario(),
  ]);

  return (
    <PainelExtrato
      lancamentos={lancamentos}
      categorias={categorias}
      periodo={periodo}
      ano={ano}
      mes={mes}
      dia={dia}
      ordem={ordem}
      de={de}
      ate={ate}
    />
  );
}
