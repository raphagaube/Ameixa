import { AlternarTema } from "@/components/alternar-tema";
import { PaginaConfiguracao } from "@/components/pagina-configuracao";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { EscolhaAcento } from "../../ajustes/escolha-acento";
import { RestaurarBotao } from "../../ajustes/restaurar-botao";

export const metadata = { title: "Aparência · Ameixa" };
export default async function Aparencia() {
  const perfil = await perfilDoUsuario();
  return (
    <PaginaConfiguracao titulo="Aparência" descricao="Escolha o tema e a cor de destaque do seu Ameixa.">
      <section className="flex flex-col" style={{ gap: 16 }}>
        <div className="flex items-center justify-between"><h2 style={{ fontSize: 17 }}>Tema claro ou escuro</h2><AlternarTema /></div>
        <EscolhaAcento inicial={perfil?.cor_acento} />
      </section>
      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Botão de registro fácil</h2><RestaurarBotao />
      </section>
    </PaginaConfiguracao>
  );
}
