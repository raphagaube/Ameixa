import Image from "next/image";
import logo from "../../public/ameixa-marca-v4.png";

/**
 * Arte do Canva enviada pelo Raphael, com fundo vinho e traço branco.
 * Mantém o desenho e as cores originais nos dois temas.
 */
export function LogoAmeixa({
  tamanho = 46,
  className,
}: {
  tamanho?: number;
  className?: string;
}) {
  return (
    <Image
      src={logo}
      alt="Ameixa"
      width={tamanho}
      height={tamanho}
      unoptimized
      className={["logo-ameixa", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: tamanho,
        height: tamanho,
        objectFit: "contain",
      }}
    />
  );
}
