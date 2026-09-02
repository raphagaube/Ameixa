import Link from "next/link";
import { LogoAmeixa } from "@/components/logo-ameixa";

/**
 * Moldura das páginas públicas de política e termos.
 *
 * Ficam fora do app porque precisam abrir sem login: o Google exige poder
 * ler a política de privacidade antes de qualquer pessoa autorizar o
 * acesso à agenda. Por isso `/privacidade` e `/termos` também entram na
 * lista de rotas públicas do proxy.
 */
export default function LayoutLegal({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 20px 56px",
        lineHeight: 1.65,
      }}
    >
      <Link
        href="/"
        className="flex items-center"
        style={{ gap: 10, color: "var(--color-text)", marginBottom: 28 }}
      >
        <LogoAmeixa tamanho={28} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>Ameixa</span>
      </Link>

      <article className="conteudo-legal">{children}</article>

      <footer
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid var(--ln)",
          fontSize: 12,
          color: "var(--mut)",
        }}
      >
        <p>
          <Link href="/privacidade" style={{ color: "var(--deep)" }}>
            Política de Privacidade
          </Link>
          {" · "}
          <Link href="/termos" style={{ color: "var(--deep)" }}>
            Termos de Uso
          </Link>
        </p>
        <p style={{ marginTop: 6 }}>
          © {new Date().getFullYear()} Rapha. Todos os direitos reservados.
        </p>
      </footer>
    </main>
  );
}
