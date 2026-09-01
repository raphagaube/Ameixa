import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { categoriasDoUsuario } from "@/lib/dados/categorias";
import { pendencias } from "@/lib/dados/lancamentos";
import { agruparPorCategoriaOriginal } from "@/lib/organizar";
import { PainelOrganizar } from "./painel-organizar";

export const metadata = { title: "Organizar pendências · Ameixa" };

export default async function Organizar() {
  const [lista, categorias] = await Promise.all([
    pendencias(),
    categoriasDoUsuario(),
  ]);

  const grupos = agruparPorCategoriaOriginal(
    lista.map((l) => ({
      id: l.id,
      tipo: l.tipo,
      valor: l.valor,
      observacao: l.observacao,
    })),
  );

  const semPista = lista.length - grupos.reduce((s, g) => s + g.ids.length, 0);

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Organizar em lote" />
      <PainelOrganizar
        grupos={grupos}
        categorias={categorias.map((c) => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
        }))}
        semPista={semPista}
      />
    </div>
  );
}
