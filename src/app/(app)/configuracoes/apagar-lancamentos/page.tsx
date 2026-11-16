import { PaginaConfiguracao } from "@/components/pagina-configuracao";
import { ApagarLancamentos } from "../../ajustes/apagar-lancamentos";

export const metadata = { title: "Apagar lançamentos · Ameixa" };
export default function Apagar() {
  return (
    <PaginaConfiguracao titulo="Apagar lançamentos" descricao="Escolha todo o histórico ou um período. Confira a quantidade e confirme antes de excluir.">
      <ApagarLancamentos />
    </PaginaConfiguracao>
  );
}
