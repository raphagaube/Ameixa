"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/botao";
import { montarBackup, NOME_DA_TABELA } from "@/lib/backup";
import { baixarJson } from "@/lib/exportar";
import { hojeEmBrasilia, paraIso } from "@/lib/formato";
import { useOcupado } from "@/lib/use-ocupado";
import { buscarPaginaDoBackup } from "./backup";

/** Backup completo em JSON: tudo que é seu, num arquivo só. */
export function ExportarDados() {
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  // Não é useTransition: são vários pedidos em sequência, e dentro de uma
  // transição os menus não responderiam até o último voltar.
  const [baixando, iniciar] = useOcupado();

  function exportar() {
    setErro(null);
    setRecado(null);
    iniciar(async () => {
      let r;
      try {
        r = await montarBackup(buscarPaginaDoBackup, (tabela, lidas, total) =>
          setRecado(`Lendo ${NOME_DA_TABELA[tabela]}… ${lidas} de ${total}`),
        );
      } catch {
        r = { ok: false as const, erro: "A conexão caiu no meio do backup. Tente de novo." };
      }
      if (!r.ok) {
        setRecado(null);
        setErro(r.erro);
        return;
      }
      baixarJson(r.dados, `ameixa-backup-${paraIso(hojeEmBrasilia())}.json`);
      const n = (r.dados.contagem as Record<string, number>).lancamentos;
      setRecado(`Backup salvo, com ${n} ${n === 1 ? "lançamento" : "lançamentos"}.`);
    });
  }

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <Botao variante="contorno" onClick={exportar} carregando={baixando}>
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <Download size={18} strokeWidth={1.5} aria-hidden />
          Baixar backup dos meus dados
        </span>
      </Botao>
      {recado ? (
        <p role="status" style={{ fontSize: 12, color: "var(--mut)" }}>
          {recado}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" style={{ fontSize: 12, color: "var(--bad)" }}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}
