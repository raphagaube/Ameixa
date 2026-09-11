import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { pendenciasTodas } from "@/lib/dados/lancamentos";
import { agruparSeries, possiveisRepetidas } from "@/lib/recorrentes";
import { PainelRecorrentes } from "./painel-recorrentes";

export const metadata = { title: "Contas recorrentes · Ameixa" };

export default async function Recorrentes() {
  const series = agruparSeries(await pendenciasTodas());
  const repetidas = Object.fromEntries(possiveisRepetidas(series));

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Contas recorrentes" />
      <PainelRecorrentes series={series} repetidas={repetidas} />
    </div>
  );
}
