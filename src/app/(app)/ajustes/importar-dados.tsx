"use client";

import { Link2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { diagnosticar, explicarFalha, lerCsv, mapearLancamentos } from "@/lib/csv";
import { importarLancamentos } from "./importar";
import { importarDoGoogle } from "./importar-planilha";

type Msg = { tipo: "ok" | "erro"; texto: string } | null;

/** Importa de arquivo (CSV, Excel ou backup JSON) ou de Planilhas Google. */
export function ImportarDados() {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [link, setLink] = useState("");
  const [processando, iniciar] = useTransition();

  function contar(criados: number, ignorados: number) {
    return `${criados} lançamento${criados === 1 ? "" : "s"} importado${criados === 1 ? "" : "s"}${
      ignorados > 0
        ? ` · ${ignorados} linha${ignorados === 1 ? "" : "s"} sem o formato esperado ficaram de fora`
        : ""
    }. Estão em Pendências, esperando categoria e conta.`;
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setMsg(null);

    const nome = arquivo.name.toLowerCase();
    let linhas: unknown[] = [];
    let porQue: string | null = null;

    try {
      if (nome.endsWith(".xlsx") || nome.endsWith(".xls")) {
        // O leitor do Excel é pesado; só carrega quando alguém escolhe um.
        const { lerExcel, mapearDoExcel } = await import("@/lib/excel");
        const brutas = lerExcel(await arquivo.arrayBuffer());
        linhas = mapearDoExcel(brutas);
        if (linhas.length === 0)
          porQue = explicarFalha(
            diagnosticar(brutas),
            brutas.length > 0 ? Object.keys(brutas[0]) : [],
          );
      } else if (nome.endsWith(".json")) {
        const json = JSON.parse(await arquivo.text());
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
        const brutas = lerCsv(await arquivo.text());
        linhas = mapearLancamentos(brutas);
        if (linhas.length === 0)
          porQue = explicarFalha(
            diagnosticar(brutas),
            brutas.length > 0 ? Object.keys(brutas[0]) : [],
          );
      }
    } catch {
      setMsg({
        tipo: "erro",
        texto: "Não consegui ler esse arquivo. Aceito Excel (.xlsx), CSV e backup JSON.",
      });
      e.target.value = "";
      return;
    }

    if (linhas.length === 0) {
      setMsg({
        tipo: "erro",
        texto:
          porQue ??
          "Não achei lançamentos. A primeira linha precisa ter as colunas Data, Descrição e Valor.",
      });
      e.target.value = "";
      return;
    }

    iniciar(async () => {
      const r = await importarLancamentos(linhas);
      setMsg(
        r.ok
          ? { tipo: "ok", texto: contar(r.criados, r.ignorados) }
          : { tipo: "erro", texto: r.erro },
      );
      if (r.ok) router.refresh();
      e.target.value = "";
    });
  }

  function importarLink() {
    setMsg(null);
    iniciar(async () => {
      const r = await importarDoGoogle(link);
      if (r.ok) {
        setMsg({ tipo: "ok", texto: contar(r.criados, r.ignorados) });
        setLink("");
        router.refresh();
      } else {
        setMsg({ tipo: "erro", texto: r.erro });
      }
    });
  }

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
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
        {processando ? "Importando…" : "Importar Excel, CSV ou backup"}
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.json"
          onChange={aoEscolherArquivo}
          disabled={processando}
          style={{ display: "none" }}
        />
      </label>

      <div
        className="flex flex-col"
        style={{
          gap: 10,
          border: "1px solid var(--ln2)",
          borderRadius: "var(--r)",
          padding: 14,
        }}
      >
        <Campo
          rotulo="Planilhas Google"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Cole o link da planilha"
          inputMode="url"
        />
        <p style={{ fontSize: 12, color: "var(--mut)" }}>
          Abra a planilha, copie o endereço da barra do navegador e cole aqui.
          Ela precisa estar compartilhada como “Qualquer pessoa com o link”.
        </p>
        <Botao
          variante="contorno"
          onClick={importarLink}
          disabled={processando || !link.trim()}
        >
          <span className="flex items-center justify-center" style={{ gap: 8 }}>
            <Link2 size={18} strokeWidth={1.5} aria-hidden />
            Importar do link
          </span>
        </Botao>
      </div>

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
