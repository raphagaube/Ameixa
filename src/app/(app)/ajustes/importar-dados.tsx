"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { lerCsv, mapearLancamentos } from "@/lib/csv";
import { importarLancamentos } from "./importar";

/** Importa lançamentos de um CSV (ou planilha salva como CSV) ou de um backup JSON. */
export function ImportarDados() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(
    null,
  );
  const [processando, iniciar] = useTransition();

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setMsg(null);

    const texto = await arquivo.text();
    let linhas: unknown[] = [];

    try {
      if (arquivo.name.toLowerCase().endsWith(".json")) {
        const json = JSON.parse(texto);
        const brutos = Array.isArray(json) ? json : (json.lancamentos ?? []);
        linhas = (brutos as Record<string, unknown>[]).map((l) => ({
          tipo: l.tipo,
          valor: Number(l.valor),
          descricao: l.descricao,
          data_registro: String(l.data_registro ?? "").slice(0, 10),
          observacao: l.observacao ?? null,
          responsavel: l.responsavel ?? null,
        }));
      } else {
        linhas = mapearLancamentos(lerCsv(texto));
      }
    } catch {
      setMsg({
        tipo: "erro",
        texto: "Não consegui ler esse arquivo. Use o CSV exportado pelo app ou um backup JSON.",
      });
      e.target.value = "";
      return;
    }

    if (linhas.length === 0) {
      setMsg({
        tipo: "erro",
        texto:
          "Não achei lançamentos. O arquivo precisa ter as colunas Data, Descrição e Valor.",
      });
      e.target.value = "";
      return;
    }

    iniciar(async () => {
      const r = await importarLancamentos(linhas);
      if (r.ok) {
        setMsg({
          tipo: "ok",
          texto: `${r.criados} lançamento${r.criados === 1 ? "" : "s"} importado${r.criados === 1 ? "" : "s"}${r.ignorados > 0 ? ` · ${r.ignorados} linha${r.ignorados === 1 ? "" : "s"} sem o formato esperado ficaram de fora` : ""}. Estão em Pendências, esperando categoria e conta.`,
        });
        router.refresh();
      } else {
        setMsg({ tipo: "erro", texto: r.erro });
      }
      e.target.value = "";
    });
  }

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <label
        className="flex items-center justify-center"
        style={{
          gap: 8,
          minHeight: 52,
          borderRadius: "var(--rs)",
          border: "1px solid var(--ln)",
          color: "var(--color-text)",
          fontSize: 14,
          fontWeight: 600,
          cursor: processando ? "wait" : "pointer",
          opacity: processando ? 0.6 : 1,
          padding: 12,
        }}
      >
        <Upload size={18} strokeWidth={1.5} aria-hidden />
        {processando ? "Importando…" : "Importar CSV ou backup JSON"}
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          onChange={aoEscolher}
          disabled={processando}
          style={{ display: "none" }}
        />
      </label>

      <p style={{ fontSize: 12, color: "var(--mut)" }}>
        Traz os lançamentos. Contas, cartões e categorias não vêm junto — os
        códigos internos seriam de outro usuário. Cada lançamento importado
        entra em Pendências para você escolher a categoria.
      </p>

      {msg ? (
        <p
          role={msg.tipo === "erro" ? "alert" : "status"}
          style={{
            fontSize: 13,
            color: msg.tipo === "erro" ? "var(--bad)" : "var(--color-text)",
            background: msg.tipo === "erro" ? "transparent" : "var(--tint)",
            borderLeft: msg.tipo === "erro" ? "3px solid var(--bad)" : undefined,
            borderRadius: msg.tipo === "erro" ? 0 : "var(--rs)",
            padding: msg.tipo === "erro" ? "0 0 0 10px" : 12,
          }}
        >
          {msg.texto}
        </p>
      ) : null}
    </div>
  );
}
