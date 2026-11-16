"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  House,
  ReceiptText,
  Menu,
  Target,
} from "lucide-react";

export const ABAS = [
  { href: "/", rotulo: "Início", Icone: House },
  { href: "/extrato", rotulo: "Extrato", Icone: ReceiptText },
  { href: "/relatorios", rotulo: "Relatórios", Icone: ChartPie },
  { href: "/metas", rotulo: "Metas", Icone: Target },
] as const;

export function BarraAbas({ aoMenu, menuAberto, botaoMenu }: { aoMenu: () => void; menuAberto: boolean; botaoMenu?: React.Ref<HTMLButtonElement> }) {
  const caminho = usePathname();
  const menuAtivo = menuAberto || !ABAS.some(({ href }) => href === "/" ? caminho === "/" : caminho.startsWith(href) || (href === "/metas" && caminho.startsWith("/orcamentos")));

  return (
    <nav
      aria-label="Navegação principal"
      // No notebook quem navega é a barra lateral.
      className="so-celular fixed inset-x-0 bottom-0 z-40 border-t"
      style={{
        background: "var(--sf)",
        borderColor: "var(--ln)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul
        className="mx-auto grid grid-cols-5"
        style={{ maxWidth: "var(--largura)" }}
      >
        {ABAS.map(({ href, rotulo, Icone }) => {
          const ativa =
            href === "/" ? caminho === "/" : caminho.startsWith(href) || (href === "/metas" && caminho.startsWith("/orcamentos"));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className="flex h-14 flex-col items-center justify-center gap-1"
                // Aba ativa usa --deep, nunca --ac puro: com acento quase preto
                // no tema escuro o --ac desaparece no fundo.
                style={{ color: ativa ? "var(--deep)" : "var(--mut)" }}
              >
                <Icone size={20} strokeWidth={1.5} aria-hidden />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: ativa ? 700 : 500,
                    letterSpacing: ".02em",
                  }}
                >
                  {rotulo}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <button ref={botaoMenu} type="button" onClick={aoMenu} aria-expanded={menuAberto} aria-haspopup="dialog" aria-controls="menu-movel" className="flex h-14 w-full flex-col items-center justify-center gap-1" style={{ color: menuAtivo ? "var(--deep)" : "var(--mut)", background: "transparent" }}>
            <Menu size={20} strokeWidth={1.5} aria-hidden />
            <span style={{ fontSize: 10, fontWeight: menuAtivo ? 700 : 500, letterSpacing: ".02em" }}>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
