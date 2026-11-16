import { AlternarTema } from "@/components/alternar-tema";
import { PaginaConfiguracao } from "@/components/pagina-configuracao";
import { EscolhaAcento } from "../../ajustes/escolha-acento";
import { RestaurarBotao } from "../../ajustes/restaurar-botao";

export const metadata = { title: "Aparência · Ameixa" };
export default function Aparencia() {
  return (
    <PaginaConfiguracao titulo="Aparência" descricao="Escolha como prefere visualizar o seu Ameixa.">
      <section className="flex flex-col" style={{ gap: 16 }}>
        <div className="flex items-center justify-between"><h2 style={{ fontSize: 17 }}>Tema claro ou escuro</h2><AlternarTema /></div>
        <EscolhaAcento />
      </section>
      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Botão de registro fácil</h2><RestaurarBotao />
      </section>
    </PaginaConfiguracao>
  );
}
