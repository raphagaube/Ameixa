import { redirect } from "next/navigation";
import { CascaLancamentos } from "@/components/casca-lancamentos";
import { dadosDeApoio } from "@/lib/dados/apoio";
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
  // Em paralelo: antes eram dois awaits em fila, e o segundo só começava
  // depois que o primeiro voltasse do banco.
  const [perfil, dados] = await Promise.all([perfilDoUsuario(), dadosDeApoio()]);

  // O proxy já barra quem não está logado; isto cobre o perfil que sumiu do
  // banco, para não renderizar tela quebrada.
  if (!perfil) redirect("/entrar");

  return (
    <CascaLancamentos dados={dados}>
      {children}
    </CascaLancamentos>
  );
}
