import { redirect } from "next/navigation";

/** Compatibilidade com favoritos e retornos antigos do Google Agenda. */
export default async function Ajustes({ searchParams }: { searchParams: Promise<{ agenda?: string }> }) {
  const busca = await searchParams;
  if (busca.agenda) redirect(`/configuracoes/google-agenda?agenda=${encodeURIComponent(busca.agenda)}`);
  redirect("/configuracoes/minha-conta");
}
