import { Suspense } from "react";
import { FormularioEntrada } from "./formulario-entrada";

export const metadata = { title: "Entrar · Ameixa" };

export default function Entrar() {
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
      <Suspense fallback={null}>
        <FormularioEntrada />
      </Suspense>
    </main>
  );
}
