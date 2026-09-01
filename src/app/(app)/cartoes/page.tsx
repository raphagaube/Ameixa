import { contasDoUsuario } from "@/lib/dados/contas";
import { PainelCartoes } from "./painel-cartoes";

export const metadata = { title: "Cartões e contas · Ameixa" };

export default async function CartoesEContas() {
  const contas = await contasDoUsuario();
  return <PainelCartoes contas={contas} />;
}
