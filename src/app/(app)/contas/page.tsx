import { hojeEmBrasilia } from "@/lib/formato";
import { contasDoUsuario } from "@/lib/dados/contas";
import { panoramaDasContas } from "@/lib/dados/saldos";
import { PainelCartoes } from "../cartoes/painel-cartoes";

export const metadata = { title: "Contas · Ameixa" };
export default async function Contas() {
  const [contas, panorama] = await Promise.all([contasDoUsuario(), panoramaDasContas()]);
  const hoje = hojeEmBrasilia();
  return <PainelCartoes aba="contas" contas={contas} saldos={panorama.contas} faturas={[]} totalDespesasDoMes={0} ano={hoje.getFullYear()} mes={hoje.getMonth()} />;
}
