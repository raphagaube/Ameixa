"use client";

import Link from "next/link";
import { LogoMenu } from "@/components/logo-menu";
import { MenuPrincipal } from "@/components/menu-principal";

export function BarraLateral({ pendencias }: { pendencias: number }) {
  return (
    <nav aria-label="Navegação principal" className="so-notebook barra-menu">
      <header className="menu-cabecalho">
        <Link href="/" className="menu-marca" aria-label="Ameixa — Início">
          <LogoMenu />
          <span>Ameixa</span>
        </Link>
      </header>
      <div className="menu-rolagem">
        <MenuPrincipal pendencias={pendencias} />
      </div>
    </nav>
  );
}
