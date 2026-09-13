"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { CampoData } from "@/components/ui/campo-data";
import { baixarArquivo } from "@/lib/exportar";
import { paraIso } from "@/lib/formato";
import type { ListasPlanilha } from "@/lib/listas-planilha";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";
import { buscarLancamentosParaPlanilha } from "./planilha";

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Baixar a planilha do Ameixa: o modelo em branco para preencher e importar,
 * ou os lançamentos já registrados, no mesmo formato.
 */
export function BaixarPlanilhas({ listas }: { listas: ListasPlanilha }) {
  const hoje = paraIso(new Date());
  const [periodo, setPeriodo] = useState<"tudo" | "faixa">("tudo");
  const [de, setDe] = useState(`${hoje.slice(0, 4)}-01-01`);
  const [ate, setAte] = useState(hoje);
  const [recado, setRecado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, iniciar] = useTransition();

  async function montar(lancamentos: LancamentoNaLista[]) {
    // O SheetJS pesa: só é baixado quando alguém pede uma planilha.
    const { gerarPlanilhaAmeixa } = await import("@/lib/planilha-ameixa");
    return gerarPlanilhaAmeixa(lancamentos, listas);
  }

  function baixarModelo() {
    setErro(null);
    setRecado(null);
    iniciar(async () => {
      baixarArquivo("ameixa-modelo-de-importacao.xlsx", await montar([]), TIPO_XLSX);
      setRecado("Modelo baixado. Preencha a aba Lançamentos e importe aqui.");
    });
  }

  function baixarLancamentos() {
    setErro(null);
    setRecado(null);
    iniciar(async () => {
      const faixa = periodo === "faixa";
      const r = await buscarLancamentosParaPlanilha(faixa ? de : "", faixa ? ate : "");
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      if (r.lancamentos.length === 0) {
        setErro(faixa ? "Nenhum lançamento nesse período." : "Ainda não há lançamentos.");
        return;
      }
      const nome = faixa
        ? `ameixa-lancamentos-${de}-a-${ate}.xlsx`
        : `ameixa-lancamentos-${hoje}.xlsx`;
      baixarArquivo(nome, await montar(r.lancamentos), TIPO_XLSX);
      setRecado(
        `${r.lancamentos.length} ${r.lancamentos.length === 1 ? "lançamento" : "lançamentos"} na planilha.`,
      );
    });
  }

  const chip = (ativo: boolean): React.CSSProperties => ({
    flex: 1,
    minHeight: 44,
    borderRadius: "var(--rs)",
    border: `1px solid ${ativo ? "var(--deep)" : "var(--ln)"}`,
    background: ativo ? "var(--tint)" : "transparent",
    color: ativo ? "var(--deep)" : "var(--color-text)",
    fontSize: 13,
    fontWeight: 600,
  });

  return (
    <section
      className="flex flex-col"
      style={{
        gap: 10,
        padding: 14,
        borderRadius: "var(--r)",
        border: "1px solid var(--ln2)",
        background: "var(--sf)",
      }}
    >
      <div>
        <h2 style={{ fontSize: 17 }}>Planilha do Ameixa</h2>
        <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 4, lineHeight: 1.5 }}>
          Já vem com as colunas que o importador reconhece sozinho, instruções e uma aba com
          as suas categorias, contas e formas de pagamento.
        </p>
      </div>

      <Botao variante="contorno" onClick={baixarModelo} carregando={gerando}>
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <FileSpreadsheet size={18} strokeWidth={1.5} aria-hidden />
          Baixar modelo em branco
        </span>
      </Botao>

      <div className="flex" style={{ gap: 8 }}>
        <button
          type="button"
          aria-pressed={periodo === "tudo"}
          onClick={() => setPeriodo("tudo")}
          style={chip(periodo === "tudo")}
        >
          Todos os lançamentos
        </button>
        <button
          type="button"
          aria-pressed={periodo === "faixa"}
          onClick={() => setPeriodo("faixa")}
          style={chip(periodo === "faixa")}
        >
          Escolher período
        </button>
      </div>

      {periodo === "faixa" ? (
        <div className="flex flex-col" style={{ gap: 10 }}>
          <CampoData rotulo="De" valor={de} aoMudar={setDe} />
          <CampoData rotulo="Até" valor={ate} aoMudar={setAte} />
        </div>
      ) : null}

      <Botao variante="contorno" onClick={baixarLancamentos} carregando={gerando}>
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <Download size={18} strokeWidth={1.5} aria-hidden />
          Baixar meus lançamentos
        </span>
      </Botao>

      <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>
        A planilha com os seus lançamentos serve para conferir, guardar ou editar em outro lugar.
        Importá-la de volta cria lançamentos novos — ela não altera os que já existem, e o
        Ameixa avisa antes se encontrar repetidos.
      </p>

      {recado ? (
        <p role="status" style={{ fontSize: 13, color: "var(--ok)" }}>
          {recado}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>
          {erro}
        </p>
      ) : null}
    </section>
  );
}
