import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { dadosDeApoio } from "@/lib/dados/apoio";
import { listasDaPlanilha } from "@/lib/listas-planilha";
import { Assistente } from "./assistente";

export const metadata = { title: "Importar · Ameixa" };

export default async function Importar() {
  const apoio = await dadosDeApoio();

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Importar" />
      <Assistente
        contas={apoio.contas.map((c) => ({ id: c.id, nome: c.nome, cor: c.cor }))}
        categorias={apoio.categorias.map((c) => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          subcategorias: c.subcategorias.map((s) => ({ id: s.id, nome: s.nome })),
        }))}
        listas={listasDaPlanilha(apoio)}
      />
    </div>
  );
}
