import logo from "../../public/ameixa-logo-v2.png";

/**
 * Marca transparente preparada pelo Raphael no Canva.
 * A máscara preserva o desenho e acompanha a paleta nos dois temas.
 */
export function LogoAmeixa({
  tamanho = 46,
  className,
}: {
  tamanho?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="Ameixa"
      className={["logo-ameixa", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: tamanho,
        height: Math.round((tamanho * logo.height) / logo.width),
        background: "var(--marca)",
        maskImage: `url(${logo.src})`,
        maskSize: "contain",
        maskPosition: "center",
        maskRepeat: "no-repeat",
      }}
    />
  );
}
