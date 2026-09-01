import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { pendencias } from "@/lib/dados/lancamentos";
import { ListaPendencias } from "./lista-pendencias";

export const metadata = { title: "Pendências · Ameixa" };

export default async function Pendencias() {
  const lista = await pendencias();

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Pendências" />
      <ListaPendencias lista={lista} />
    </div>
  );
}
