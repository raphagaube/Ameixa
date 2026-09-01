import { redirect } from "next/navigation";
import { BarraAbas } from "@/components/barra-abas";
import { BotaoRegistroFacil } from "@/components/botao-registro-facil";
import { perfilDoUsuario } from "@/lib/dados/perfil";

/**
 * Casca das telas do app: conteúdo centralizado em 430px, com respiro embaixo
 * para não colidir com o botão flutuante nem com a barra de abas.
 */
export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  // O middleware já barra quem não está logado; isto cobre o caso do perfil
  // que sumiu do banco, para não renderizar tela quebrada.
  const perfil = await perfilDoUsuario();
  if (!perfil) redirect("/entrar");

  return (
    <>
      <main
        className="mx-auto w-full"
        style={{
          maxWidth: "var(--largura)",
          paddingLeft: "var(--pad-lateral)",
          paddingRight: "var(--pad-lateral)",
          paddingBottom: "var(--pad-inferior)",
        }}
      >
        {children}
      </main>
      <BotaoRegistroFacil />
      <BarraAbas />
    </>
  );
}
