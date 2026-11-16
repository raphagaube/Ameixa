"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { LogoAmeixa } from "@/components/logo-ameixa";
import { MenuPrincipal } from "@/components/menu-principal";

export function BarraLateral({ aoLancar, pendencias }: { aoLancar: () => void; pendencias: number }) {
  return (
    <nav aria-label="Navegação principal" className="so-notebook barra-menu">
      <Link href="/" className="menu-marca"><LogoAmeixa tamanho={30} /><span>Ameixa</span></Link>
      <button type="button" onClick={aoLancar} className="menu-novo"><Plus size={18} strokeWidth={1.5} aria-hidden />Novo lançamento</button>
      <MenuPrincipal pendencias={pendencias} />
    </nav>
  );
}
