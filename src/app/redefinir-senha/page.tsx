import { FormularioNovaSenha } from "./formulario-nova-senha";

export const metadata = { title: "Nova senha · Ameixa" };

/**
 * Destino do link de recuperação. Fica fora do grupo (app) de propósito:
 * quem chega aqui está com uma sessão de recuperação, não com o app aberto.
 */
export default function RedefinirSenha() {
  return (
    <main
      className="mx-auto flex min-h-screen w-full flex-col justify-center"
      style={{
        maxWidth: "var(--largura)",
        paddingLeft: "var(--pad-lateral)",
        paddingRight: "var(--pad-lateral)",
        paddingTop: 32,
        paddingBottom: 32,
      }}
    >
      <FormularioNovaSenha />
    </main>
  );
}
