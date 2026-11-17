import { iconeCategoriaValido } from "@/lib/icones-categorias";

/** A máscara preserva o desenho original e acompanha a cor do texto. */
export function IconeCategoria({ icone, tamanho = 20 }: { icone?: string | null; tamanho?: number }) {
  if (!iconeCategoriaValido(icone)) return null;
  const mascara = `url("/icones-categorias/${icone}.svg")`;
  return <span aria-hidden="true" data-icone-categoria={icone} style={{
    display: "inline-block", width: tamanho, height: tamanho, flexShrink: 0,
    backgroundColor: "currentColor", maskImage: mascara, WebkitMaskImage: mascara,
    maskMode: "alpha", maskSize: "contain", WebkitMaskSize: "contain",
    maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
    maskPosition: "center", WebkitMaskPosition: "center", verticalAlign: "middle",
  }} />;
}
