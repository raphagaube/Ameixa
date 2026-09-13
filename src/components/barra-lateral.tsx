"use client";

import {
  ArrowLeftRight,
  CreditCard,
  ListTree,
  PiggyBank,
  Plus,
  Repeat,
  TriangleAlert,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ABAS } from "@/components/barra-abas";
import { LogoAmeixa } from "@/components/logo-ameixa";

/** Telas de segundo nível que, no celular, ficam atrás da aba Ajustes. */
const ATALHOS = [
  { href: "/recorrentes", rotulo: "Contas recorrentes", Icone: Repeat },
  { href: "/pendencias", rotulo: "Pendências", Icone: TriangleAlert },
  { href: "/cartoes", rotulo: "Cartões e contas", Icone: CreditCard },
  { href: "/orcamentos", rotulo: "Orçamentos", Icone: PiggyBank },
  { href: "/categorias", rotulo: "Categorias", Icone: ListTree },
  { href: "/importar", rotulo: "Importar planilha", Icone: Upload },
  { href: "/conciliacao", rotulo: "Conciliação (OFX)", Icone: ArrowLeftRight },
] as const;

/**
 * Navegação do notebook.
 *
 * Só aparece a partir de 1024px (classe `so-notebook`); no celular a
 * navegação continua sendo a barra de abas do rodapé. Com espaço sobrando,
 * as telas que no celular ficam a dois toques — Contas recorrentes,
 * Pendências, Cartões — ficam à vista, e lançar é um botão sempre presente
 * em vez do botão flutuante, que só existe no Início.
 */
export function BarraLateral({ aoLancar }: { aoLancar: () => void }) {
  const caminho = usePathname();
  const ativa = (href: string) =>
    href === "/" ? caminho === "/" : caminho.startsWith(href);

  const link = (href: string, rotulo: string, Icone: typeof Plus) => {
    const esta = ativa(href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={esta ? "page" : undefined}
          className="flex items-center"
          style={{
            gap: 10,
            minHeight: 42,
            padding: "0 12px",
            borderRadius: "var(--rs)",
            fontSize: 14,
            fontWeight: esta ? 700 : 500,
            // Ativo usa --deep, nunca --ac puro — mesma regra das abas.
            color: esta ? "var(--deep)" : "var(--color-text)",
            background: esta ? "var(--tint)" : "transparent",
          }}
        >
          <Icone size={18} strokeWidth={1.5} aria-hidden style={{ flexShrink: 0 }} />
          <span className="truncate">{rotulo}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="so-notebook fixed inset-y-0 left-0 z-40 flex-col"
      style={{
        width: "var(--barra-lateral)",
        gap: 18,
        padding: "22px 14px",
        background: "var(--sf)",
        borderRight: "1px solid var(--ln)",
        overflowY: "auto",
      }}
    >
      <Link
        href="/"
        className="flex items-center"
        style={{ gap: 10, padding: "0 6px", color: "var(--color-text)" }}
      >
        <LogoAmeixa tamanho={30} />
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
          Ameixa
        </span>
      </Link>

      <button
        type="button"
        onClick={aoLancar}
        className="flex items-center justify-center"
        style={{
          gap: 8,
          minHeight: 44,
          borderRadius: "var(--rs)",
          background: "var(--deep)",
          color: "var(--on-ac)",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        <Plus size={18} strokeWidth={2} aria-hidden />
        Novo lançamento
      </button>

      <ul className="flex flex-col" style={{ gap: 2 }}>
        {ABAS.map(({ href, rotulo, Icone }) => link(href, rotulo, Icone))}
      </ul>

      <div className="flex flex-col" style={{ gap: 6 }}>
        <p className="rotulo" style={{ padding: "0 12px" }}>
          Atalhos
        </p>
        <ul className="flex flex-col" style={{ gap: 2 }}>
          {ATALHOS.map(({ href, rotulo, Icone }) => link(href, rotulo, Icone))}
        </ul>
      </div>
    </nav>
  );
}
