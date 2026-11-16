import Image from "next/image";
import logo from "../../public/ameixa-logo-v2.png";

/**
 * Marca transparente preparada pelo Raphael no Canva.
 * O CSS acompanha o tema desde a primeira pintura e mantém o traço preto
 * na impressão, sem acrescentar um fundo à imagem.
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
      height={Math.round((tamanho * logo.height) / logo.width)}
      priority
      className={["logo-ameixa", className].filter(Boolean).join(" ")}
      style={{ height: "auto" }}
    />
  );
}
