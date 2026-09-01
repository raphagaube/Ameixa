import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { categoriasDoUsuario } from "@/lib/dados/categorias";
import { contasDoUsuario } from "@/lib/dados/contas";
import { Assistente } from "./assistente";

export const metadata = { title: "Importar · Ameixa" };

export default async function Importar() {
  const [contas, categorias] = await Promise.all([
    contasDoUsuario(),
    categoriasDoUsuario(),
  ]);

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Importar" />
      <Assistente
        contas={contas.map((c) => ({ id: c.id, nome: c.nome, cor: c.cor }))}
        categorias={categorias.map((c) => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
        }))}
      />
    </div>
  );
}
