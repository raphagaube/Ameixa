import { after } from "next/server";
import { PaginaConfiguracao } from "@/components/pagina-configuracao";
import { AVISO_RETORNO, type MotivoRetorno } from "@/lib/agenda/oauth";
import { drenarFila } from "@/lib/agenda/sincronizar";
import { statusAgenda } from "@/lib/dados/agenda";
import { AgendaGoogle } from "../../ajustes/agenda-google";

export const metadata = { title: "Google Agenda · Ameixa" };
export default async function GoogleAgenda({ searchParams }: { searchParams: Promise<{ agenda?: string }> }) {
  const [agenda, busca] = await Promise.all([statusAgenda(), searchParams]);
  const motivo = busca.agenda as MotivoRetorno | undefined;
  const aviso = motivo ? AVISO_RETORNO[motivo] : null;
  if (agenda.naFila > 0) after(() => drenarFila(20));
  return (
    <PaginaConfiguracao titulo="Google Agenda" descricao="Conecte e acompanhe a sincronização das suas contas a pagar e a receber.">
      {aviso ? <p role="status" style={{ fontSize: 14, padding: 12, border: "1px solid var(--ln)", borderRadius: "var(--rs)" }}>{aviso}</p> : null}
      <AgendaGoogle status={agenda} />
    </PaginaConfiguracao>
  );
}
