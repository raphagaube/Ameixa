import Link from "next/link";
import { PaginaConfiguracao } from "@/components/pagina-configuracao";
import { ExportarDados } from "../../ajustes/exportar-dados";

export const metadata = { title: "Backup dos meus dados · Ameixa" };
export default function Backup() {
  return (
    <PaginaConfiguracao titulo="Backup dos meus dados" descricao="Guarde seus cadastros, receitas, despesas e aportes em um arquivo JSON.">
      <ExportarDados />
      <section className="flex flex-col" style={{ gap: 10 }}>
        <h2 style={{ fontSize: 17 }}>Importar receitas e despesas</h2>
        <p style={{ fontSize: 14, color: "var(--mut)", lineHeight: 1.5 }}>Escolha o arquivo JSON no importador e confira as receitas e despesas antes de gravar. Cadastros e aportes ficam no arquivo para consulta.</p>
        <Link className="menu-link" style={{ border: "1px solid var(--ln)", justifyContent: "center" }} href="/importar">Abrir importador</Link>
      </section>
    </PaginaConfiguracao>
  );
}
