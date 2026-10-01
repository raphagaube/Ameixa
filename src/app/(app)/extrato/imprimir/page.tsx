import { categoriasDoUsuario } from "@/lib/dados/categorias";
import { lancamentosDoPeriodo } from "@/lib/dados/lancamentos";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { descreverFiltros, lerParametrosDoExtrato } from "@/lib/extrato-impresso";
import { DocumentoExtrato } from "./documento-extrato";

// É o título que o navegador põe no topo da folha e sugere como nome do PDF.
export const metadata = { title: "Extrato · Ameixa" };

/**
 * A tela mostra no máximo 500 lançamentos; o documento vai até aqui. Papel é
 * para conferir o período inteiro, e cortar em 500 sem avisar esconderia
 * lançamento.
 */
const LIMITE = 5000;

export default async function ImprimirExtrato({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const { ordem, datasPor, de, ate } = lerParametrosDoExtrato(p);

  const [lancamentos, categorias, perfil] = await Promise.all([
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
      limite: LIMITE,
    }),
    categoriasDoUsuario().then((c) => c ?? []),
    perfilDoUsuario(),
  ]);

  const categoria = categorias.find((c) => c.id === p.categoria);
  const filtros = descreverFiltros({
    texto: p.texto,
    categoria: categoria?.nome,
    subcategoria: categoria?.subcategorias.find((s) => s.id === p.subcategoria)?.nome,
    situacao: p.situacao,
    forma: p.forma,
    responsavel: p.responsavel,
  });

  return (
    <DocumentoExtrato
      lancamentos={lancamentos}
      nome={perfil?.nome ?? ""}
      de={de}
      ate={ate}
      datasPor={datasPor}
      filtros={filtros}
      cortado={lancamentos.length >= LIMITE}
    />
  );
}
