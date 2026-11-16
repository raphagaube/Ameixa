import { PaginaConfiguracao } from "@/components/pagina-configuracao";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { usuarioAtual } from "@/lib/supabase/servidor";
import { MinhaConta } from "../../ajustes/minha-conta";
import { BotaoSair } from "../../ajustes/botao-sair";

export const metadata = { title: "Minha conta · Ameixa" };
export default async function Conta() {
  const [perfil, usuario] = await Promise.all([perfilDoUsuario(), usuarioAtual()]);
  return (
    <PaginaConfiguracao titulo="Minha conta" descricao="Seu nome, e-mail e acesso ao Ameixa.">
      <MinhaConta nomeAtual={perfil?.nome ?? ""} emailAtual={usuario?.email ?? ""} />
      <BotaoSair />
    </PaginaConfiguracao>
  );
}
