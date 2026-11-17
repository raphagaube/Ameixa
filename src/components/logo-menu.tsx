import Image from "next/image";

/** Artes originais do Raphael; a troca de tema acontece somente no CSS. */
export function LogoMenu() {
  return (
    <span className="menu-simbolo" aria-hidden="true">
      <Image src="/ameixa-menu-claro.png" alt="" width={56} height={56} unoptimized className="menu-simbolo-claro" />
      <Image src="/ameixa-menu-escuro.png" alt="" width={56} height={56} unoptimized className="menu-simbolo-escuro" />
    </span>
  );
}
