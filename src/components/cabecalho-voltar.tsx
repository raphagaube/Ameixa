"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Cabeçalho das telas de segundo nível: seta de voltar e título. */
export function CabecalhoVoltar({
  titulo,
  acao,
}: {
  titulo: string;
  acao?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <header
      className="flex items-center"
      style={{ gap: 8, paddingTop: 22, paddingBottom: 4 }}
    >
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Voltar"
        className="grid place-items-center rounded-xl"
        style={{
          width: 38,
          height: 38,
          minHeight: 38,
          marginLeft: -8,
          color: "var(--color-text)",
          background: "transparent",
        }}
      >
        <ChevronLeft size={22} strokeWidth={1.5} aria-hidden />
      </button>
      <h1 style={{ fontSize: 30, lineHeight: 1.15, flex: 1 }}>{titulo}</h1>
      {acao}
    </header>
  );
}
