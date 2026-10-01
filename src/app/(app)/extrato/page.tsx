import { formasDePagamento } from "@/lib/dados/apoio";
import { categoriasDoUsuario } from "@/lib/dados/categorias";
import { lancamentosDoPeriodo } from "@/lib/dados/lancamentos";
import { lerParametrosDoExtrato } from "@/lib/extrato-impresso";
import { PainelExtrato } from "./painel-extrato";

export const metadata = { title: "Extrato · Ameixa" };

export default async function Extrato({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  // A leitura do endereço é a mesma do documento impresso (/extrato/imprimir).
  const { periodo, ano, mes, dia, ordem, datasPor, de, ate } = lerParametrosDoExtrato(p);

  const [lancamentos, categorias, formas] = await Promise.all([
    lancamentosDoPeriodo({
      de,
      ate,
      datasPor,
      texto: p.texto || undefined,
      categoriaId: p.categoria || undefined,
      subcategoriaId: p.subcategoria || undefined,
      situacao: p.situacao || undefined,
      forma: p.forma || undefined,
      responsavel: p.responsavel || undefined,
      ordem,
    }),
    categoriasDoUsuario().then((c) => c ?? []),
    formasDePagamento(),
  ]);

  // A forma escolhida entra na lista mesmo que não esteja cadastrada (veio de
  // uma importação, por exemplo): senão o filtro ligado ficaria invisível.
  const nomesDasFormas = [...new Set([...formas.map((f) => f.nome), ...(p.forma ? [p.forma] : [])])];

  return (
    <PainelExtrato
      lancamentos={lancamentos}
      categorias={categorias}
      formas={nomesDasFormas}
      periodo={periodo}
      datasPor={datasPor}
      ano={ano}
      mes={mes}
      dia={dia}
      ordem={ordem}
      de={de}
      ate={ate}
    />
  );
}
