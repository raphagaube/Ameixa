"use client";

import {
  ArrowLeftRight, CalendarDays, ChartPie, CreditCard,
  DatabaseBackup, House, Landmark, ListTree, Palette, ReceiptText,
  Repeat, Target, Trash2, TriangleAlert, UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GRUPOS = [
  { id: "gestao", titulo: "Minha gestão", itens: [
    { href: "/", rotulo: "Início", Icone: House },
    { href: "/pendencias", rotulo: "Pendências", Icone: TriangleAlert },
    { href: "/relatorios", rotulo: "Relatórios", Icone: ChartPie },
    { href: "/metas", tambem: "/orcamentos", rotulo: "Metas e orçamentos", Icone: Target },
    { href: "/recorrentes", rotulo: "Contas recorrentes", Icone: Repeat },
    { href: "/extrato", tambem: "/importar", rotulo: "Extrato", Icone: ReceiptText },
  ] },
  { id: "bancos", titulo: "Bancos", itens: [
    { href: "/contas", rotulo: "Contas", Icone: Landmark },
    { href: "/cartoes", rotulo: "Cartões", Icone: CreditCard },
    { href: "/conciliacao", rotulo: "Conciliação bancária · OFX", Icone: ArrowLeftRight },
  ] },
  { id: "configuracoes", titulo: "Configurações", itens: [
    { href: "/configuracoes/minha-conta", rotulo: "Minha conta", Icone: UserRound },
    { href: "/categorias", rotulo: "Categorias", Icone: ListTree },
    { href: "/configuracoes/aparencia", rotulo: "Aparência", Icone: Palette },
    { href: "/configuracoes/backup", rotulo: "Backup dos meus dados", Icone: DatabaseBackup },
    { href: "/configuracoes/google-agenda", rotulo: "Google Agenda", Icone: CalendarDays },
    { href: "/configuracoes/apagar-lancamentos", rotulo: "Apagar lançamentos", Icone: Trash2 },
  ] },
];

function corresponde(caminho: string, href: string) {
  return caminho === href || (href !== "/" && caminho.startsWith(`${href}/`));
}

/** Mesmas opções no computador e no celular, sem uma segunda lista de atalhos. */
export function MenuPrincipal({ pendencias, aoNavegar }: { pendencias: number; aoNavegar?: () => void }) {
  const caminho = usePathname();
  return (
    <div className="menu-grupos">
      {GRUPOS.map((grupo) => {
        const lista = (
          <ul className="menu-itens">
            {grupo.itens.map((item) => {
              const ativa = corresponde(caminho, item.href) ||
                ("tambem" in item && !!item.tambem && corresponde(caminho, item.tambem));
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={aoNavegar} className="menu-link" aria-current={ativa ? "page" : undefined}>
                    <item.Icone size={18} strokeWidth={1.5} aria-hidden />
                    <span>{item.rotulo}</span>
                    {item.href === "/pendencias" && pendencias > 0 ? (
                      <span className="menu-contador" aria-label={`${pendencias} ${pendencias === 1 ? "lançamento para completar" : "lançamentos para completar"}`}>
                        {pendencias > 99 ? "99+" : pendencias}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        );
        return (
          <section key={grupo.id} aria-label={grupo.titulo}>
            <h2 className="rotulo menu-titulo">{grupo.titulo}</h2>{lista}
          </section>
        );
      })}
    </div>
  );
}
