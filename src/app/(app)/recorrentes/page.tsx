import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { lancamentosParaPlanilha, pendenciasTodas } from "@/lib/dados/lancamentos";
import { agruparSeries, outrasSeries, possiveisRepetidas } from "@/lib/recorrentes";
import { PainelRecorrentes } from "./painel-recorrentes";

export const metadata = { title: "Contas recorrentes · Ameixa" };

export default async function Recorrentes() {
  // Uma leitura só, paginada: as pendências viram os cartões editáveis, e o
  // resto deixa a busca achar também as séries sem conta pendente — senão
  // uma conta toda paga parece ter sumido do app.
  const todos = await lancamentosParaPlanilha({});
  const pendentes = todos
    ? todos.filter((l) => l.situacao === "a_pagar" || l.situacao === "a_receber")
    : await pendenciasTodas();

  const series = agruparSeries(pendentes);
  const repetidas = Object.fromEntries(possiveisRepetidas(series));
  const outras = todos ? outrasSeries(todos, new Set(series.map((s) => s.chave))) : [];

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Contas recorrentes" />
      <PainelRecorrentes series={series} repetidas={repetidas} outras={outras} />
    </div>
  );
}
