"use client";

import Image from "next/image";
import { useTema } from "@/components/provedor-tema";

/**
 * Ícone da marca. O PNG é um traço preto sobre fundo branco: no tema claro
 * entra em multiply para o fundo sumir; no escuro, invertido em screen.
 */
export function LogoAmeixa({
  tamanho = 46,
  className,
}: {
  tamanho?: number;
  className?: string;
}) {
  const { modo } = useTema();

  return (
    <Image
      src="/ameixa.png"
      alt="Ameixa"
      width={tamanho}
      height={tamanho}
      priority
      className={className}
      // O PNG não é quadrado: fixar só a largura e deixar a altura livre
      // mantém a proporção sem o Next reclamar.
      style={{
        height: "auto",
        mixBlendMode: modo === "dark" ? "screen" : "multiply",
        filter: modo === "dark" ? "invert(1)" : undefined,
      }}
    />
  );
}
