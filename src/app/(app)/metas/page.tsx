import { contasDoUsuario } from "@/lib/dados/contas";
import { metasDoUsuario } from "@/lib/dados/metas";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { PainelMetas } from "./painel-metas";

export const metadata = { title: "Metas · Ameixa" };

export default async function Metas() {
  const [metas, contas, perfil] = await Promise.all([
    metasDoUsuario(),
    contasDoUsuario(),
    perfilDoUsuario(),
  ]);

  return (
    <PainelMetas
      metas={metas}
      contas={contas}
      destaque={perfil?.meta_destaque ?? null}
    />
  );
}
