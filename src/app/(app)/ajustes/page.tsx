import {
  ChevronRight,
  CreditCard,
  ListTree,
  PiggyBank,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { AlternarTema } from "@/components/alternar-tema";
import { LogoAmeixa } from "@/components/logo-ameixa";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { EscolhaAcento } from "./escolha-acento";
import { BotaoSair } from "./botao-sair";

export const metadata = { title: "Ajustes · Ameixa" };

const ATALHOS = [
  { href: "/cartoes", rotulo: "Cartões e contas", Icone: CreditCard },
  { href: "/orcamentos", rotulo: "Orçamentos", Icone: PiggyBank },
  { href: "/categorias", rotulo: "Categorias", Icone: ListTree },
  { href: "/pendencias", rotulo: "Pendências", Icone: TriangleAlert },
];

export default async function Ajustes() {
  const perfil = await perfilDoUsuario();

  return (
    <div className="flex flex-col" style={{ gap: 22, paddingTop: 22 }}>
      <header className="flex items-start justify-between" style={{ gap: 12 }}>
        <div>
          <p className="rotulo">Configurações</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, marginTop: 4 }}>Ajustes</h1>
        </div>
        <AlternarTema />
      </header>

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Tema</h2>
        <EscolhaAcento inicial={perfil?.cor_acento} />
      </section>

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Atalhos</h2>
        <ul className="celulas">
          {ATALHOS.map(({ href, rotulo, Icone }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center justify-between"
                style={{ gap: 10, padding: "14px", color: "var(--color-text)" }}
              >
                <span className="flex items-center" style={{ gap: 10 }}>
                  <Icone size={18} strokeWidth={1.5} style={{ color: "var(--deep)" }} aria-hidden />
                  <span style={{ fontSize: 15 }}>{rotulo}</span>
                </span>
                <ChevronRight size={18} strokeWidth={1.5} style={{ color: "var(--mut)" }} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Conta</h2>
        <div
          style={{
            borderRadius: "var(--r)",
            border: "1px solid var(--ln2)",
            background: "var(--sf)",
            padding: 14,
          }}
        >
          <p className="rotulo">Seu nome</p>
          <p style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>
            {perfil?.nome ?? "—"}
          </p>
        </div>
        <BotaoSair />
      </section>

      <footer
        className="flex flex-col items-center"
        style={{ gap: 6, paddingTop: 8, paddingBottom: 8 }}
      >
        <LogoAmeixa tamanho={30} />
        <p style={{ fontSize: 12, color: "var(--mut)" }}>Ameixa · v1.0</p>
      </footer>
    </div>
  );
}
