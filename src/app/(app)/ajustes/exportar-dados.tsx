"use client";

import { Download } from "lucide-react";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { baixarJson } from "@/lib/exportar";
import { paraIso } from "@/lib/formato";
import { buscarBackup } from "./backup";

/** Backup completo em JSON: tudo que é seu, num arquivo só. */
export function ExportarDados() {
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, iniciar] = useTransition();

  function exportar() {
    setErro(null);
    iniciar(async () => {
      const r = await buscarBackup();
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      baixarJson(r.dados, `ameixa-backup-${paraIso(new Date())}.json`);
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
      {erro ? (
        <p role="alert" style={{ fontSize: 12, color: "var(--bad)" }}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}
