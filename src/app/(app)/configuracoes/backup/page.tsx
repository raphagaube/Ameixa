import Link from "next/link";
import { PaginaConfiguracao } from "@/components/pagina-configuracao";
import { ExportarDados } from "../../ajustes/exportar-dados";

export const metadata = { title: "Backup dos meus dados · Ameixa" };
export default function Backup() {
  return (
    <PaginaConfiguracao titulo="Backup dos meus dados" descricao="Guarde uma cópia completa dos seus cadastros e lançamentos em um arquivo JSON.">
      <ExportarDados />
      <section className="flex flex-col" style={{ gap: 10 }}>
        <h2 style={{ fontSize: 17 }}>Restaurar uma cópia</h2>
        <p style={{ fontSize: 14, color: "var(--mut)", lineHeight: 1.5 }}>Abra o importador e escolha seu arquivo de backup. Você poderá conferir os dados antes de confirmar a importação.</p>
        <Link className="menu-link" style={{ border: "1px solid var(--ln)", justifyContent: "center" }} href="/importar">Restaurar um backup</Link>
      </section>
    </PaginaConfiguracao>
  );
}
