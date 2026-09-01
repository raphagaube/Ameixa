"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  House,
  ReceiptText,
  Settings,
  Target,
} from "lucide-react";

const ABAS = [
  { href: "/", rotulo: "Início", Icone: House },
  { href: "/extrato", rotulo: "Extrato", Icone: ReceiptText },
  { href: "/relatorios", rotulo: "Relatórios", Icone: ChartPie },
  { href: "/metas", rotulo: "Metas", Icone: Target },
  { href: "/ajustes", rotulo: "Ajustes", Icone: Settings },
] as const;

export function BarraAbas() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t"
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
            href === "/" ? caminho === "/" : caminho.startsWith(href);
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
      </ul>
    </nav>
  );
}
