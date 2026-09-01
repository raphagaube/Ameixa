import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { contasDoUsuario } from "@/lib/dados/contas";
import { PainelConciliacao } from "./painel-conciliacao";

export const metadata = { title: "Conciliação bancária · Ameixa" };

export default async function Conciliacao() {
  const contas = await contasDoUsuario();

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Conciliação bancária" />
      <PainelConciliacao contas={contas} />
    </div>
  );
}
