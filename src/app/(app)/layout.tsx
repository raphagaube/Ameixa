import { BarraAbas } from "@/components/barra-abas";
import { BotaoRegistroFacil } from "@/components/botao-registro-facil";

/**
 * Casca das telas do app: conteúdo centralizado em 430px, com respiro embaixo
 * para não colidir com o botão flutuante nem com a barra de abas.
 */
export default function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
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
