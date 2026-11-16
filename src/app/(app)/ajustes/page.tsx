import {
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  CreditCard,
  DatabaseBackup,
  FileSpreadsheet,
  ListTree,
  Palette,
  PiggyBank,
  Repeat,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Upload,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { after } from "next/server";
import { AlternarTema } from "@/components/alternar-tema";
import { AVISO_RETORNO, type MotivoRetorno } from "@/lib/agenda/oauth";
import { drenarFila } from "@/lib/agenda/sincronizar";
import { LogoAmeixa } from "@/components/logo-ameixa";
import { BaixarPlanilhas } from "@/app/(app)/importar/baixar-planilhas";
import { statusAgenda } from "@/lib/dados/agenda";
import { dadosDeApoio } from "@/lib/dados/apoio";
import { listasDaPlanilha } from "@/lib/listas-planilha";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { usuarioAtual } from "@/lib/supabase/servidor";
import { AgendaGoogle } from "./agenda-google";
import { EscolhaAcento } from "./escolha-acento";
import { ExportarDados } from "./exportar-dados";
import { RestaurarBotao } from "./restaurar-botao";
import { MinhaConta } from "./minha-conta";
import { BotaoSair } from "./botao-sair";
import { ItemAjustes } from "./item-ajustes";
import { ApagarLancamentos } from "./apagar-lancamentos";

export const metadata = { title: "Ajustes · Ameixa" };

const ATALHOS = [
  { href: "/cartoes", rotulo: "Cartões e contas", Icone: CreditCard },
  { href: "/orcamentos", rotulo: "Orçamentos", Icone: PiggyBank },
  { href: "/categorias", rotulo: "Categorias", Icone: ListTree },
  { href: "/recorrentes", rotulo: "Contas recorrentes", Icone: Repeat },
  { href: "/pendencias", rotulo: "Pendências", Icone: TriangleAlert },
  { href: "/importar", rotulo: "Importar planilha", Icone: Upload },
  { href: "/conciliacao", rotulo: "Conciliação bancária (OFX)", Icone: ArrowLeftRight },
];

export default async function Ajustes({
  searchParams,
}: {
  searchParams: Promise<{ agenda?: string }>;
}) {
  const [perfil, usuario, agenda, busca, apoio] = await Promise.all([
    perfilDoUsuario(),
    usuarioAtual(),
    statusAgenda(),
    searchParams,
    // Já buscado pelo layout do app, e em cache: não custa outra ida ao banco.
    dadosDeApoio(),
  ]);

  // O retorno do OAuth volta por aqui. A tradução vive junto do fluxo, para
  // o dono nunca ver uma mensagem crua do Google.
  const motivo = busca.agenda as MotivoRetorno | undefined;
  const aviso = motivo ? AVISO_RETORNO[motivo] : null;

  // Não há cron: no plano Hobby da Vercel ele roda uma vez por dia. O que
  // ficou preso sai daqui, depois que a tela já foi entregue.
  if (agenda.naFila > 0) after(() => drenarFila(20));

  return (
    <div className="flex flex-col" style={{ gap: 22, paddingTop: 22 }}>
      <header className="flex items-start justify-between" style={{ gap: 12 }}>
        <div>
          <p className="rotulo">Configurações</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, marginTop: 4 }}>Ajustes</h1>
        </div>
      </header>

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Aparência</h2>
        <ul className="celulas">
          <ItemAjustes titulo="Tema e cores" descricao="Modo claro, escuro e cor de destaque" Icone={Palette}>
            <div className="flex items-center justify-between" style={{ gap: 12 }}>
              <span style={{ fontSize: 14 }}>Alternar entre claro e escuro</span>
              <AlternarTema />
            </div>
            <EscolhaAcento inicial={perfil?.cor_acento} />
          </ItemAjustes>
        </ul>
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
        <h2 style={{ fontSize: 17 }}>Dados</h2>
        <ul className="celulas">
          <ItemAjustes titulo="Backup dos meus dados" descricao="Baixar uma cópia completa em JSON" Icone={DatabaseBackup}>
            <ExportarDados />
          </ItemAjustes>
          <ItemAjustes titulo="Planilhas e exportação" descricao="Modelo em branco e lançamentos em planilha" Icone={FileSpreadsheet}>
            <BaixarPlanilhas listas={listasDaPlanilha(apoio)} />
          </ItemAjustes>
          <ItemAjustes titulo="Botão de registro fácil" descricao="Devolver o botão + ao canto original" Icone={RotateCcw}>
            <RestaurarBotao />
          </ItemAjustes>
          <ItemAjustes titulo="Apagar lançamentos" descricao="Todo o histórico ou um período, com confirmação" Icone={Trash2} perigoso>
            <ApagarLancamentos />
          </ItemAjustes>
        </ul>
      </section>

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Integrações</h2>
        <ul className="celulas">
          <ItemAjustes titulo="Google Agenda" descricao={agenda.conectado ? "Conexão e sincronização dos compromissos" : "Conectar contas a pagar e a receber"} Icone={CalendarDays} aberta={!!aviso}>
            {aviso ? (
              <p
                role="status"
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  padding: 12,
                  borderRadius: "var(--rs)",
                  border: "1px solid var(--ln)",
                  color: motivo === "ok" ? "var(--color-text)" : "var(--mut)",
                }}
              >
                {aviso}
              </p>
            ) : null}
            <AgendaGoogle status={agenda} />
          </ItemAjustes>
        </ul>
      </section>

      <section className="flex flex-col" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Conta</h2>
        <ul className="celulas">
          <ItemAjustes titulo="Minha conta" descricao="Nome, e-mail, senha e sair da conta" Icone={UserRound}>
            <MinhaConta nomeAtual={perfil?.nome ?? ""} emailAtual={usuario?.email ?? ""} />
            <BotaoSair />
          </ItemAjustes>
        </ul>
      </section>

      <footer
        className="flex flex-col items-center"
        style={{ gap: 6, paddingTop: 8, paddingBottom: 8 }}
      >
        <LogoAmeixa tamanho={30} />
        <p style={{ fontSize: 12, color: "var(--mut)" }}>Ameixa · v1.0</p>
        <p style={{ fontSize: 11, color: "var(--mut)", textAlign: "center" }}>
          © {new Date().getFullYear()} Rapha. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
