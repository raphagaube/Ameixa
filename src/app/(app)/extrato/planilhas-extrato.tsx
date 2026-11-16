"use client";

import { Download, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Folha } from "@/components/ui/folha";
import { baixarArquivo } from "@/lib/exportar";
import type { ListasPlanilha } from "@/lib/listas-planilha";
import { buscarExtratoParaPlanilha } from "../importar/planilha";

export function PlanilhasExtrato({ listas, parametros }: { listas: ListasPlanilha; parametros: Record<string, string | undefined> }) {
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [gerando, iniciar] = useTransition();
  function baixar(modelo: boolean) {
    setErro(null); setRecado(null);
    iniciar(async () => {
      try {
        const r = modelo ? { ok: true as const, lancamentos: [] } : await buscarExtratoParaPlanilha(parametros);
        if (!r.ok) { setErro(r.erro); return; }
        if (!modelo && r.lancamentos.length === 0) { setErro("Nenhuma receita ou despesa nos filtros atuais."); return; }
        const { gerarPlanilhaAmeixa } = await import("@/lib/planilha-ameixa");
        baixarArquivo(modelo ? "ameixa-modelo-de-importacao.xlsx" : "ameixa-extrato-filtrado.xlsx", gerarPlanilhaAmeixa(r.lancamentos, listas), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        setRecado(modelo ? "Modelo baixado." : `Planilha baixada com ${r.lancamentos.length} lançamentos.`);
      } catch { setErro("Não deu para gerar a planilha. Tente de novo."); }
    });
  }
  return (
    <>
      <button type="button" className="flex items-center" onClick={() => { setErro(null); setRecado(null); setAberta(true); }} style={{ gap: 6, minHeight: 44, padding: "0 12px", border: "1px solid var(--ln)", borderRadius: "var(--rs)", fontSize: 13, fontWeight: 600, color: "var(--color-text)", background: "transparent" }}><FileSpreadsheet size={18} strokeWidth={1.5} aria-hidden />Planilhas</button>
      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo="Planilhas">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <Link href="/importar" className="menu-link" style={{ border: "1px solid var(--ln)" }}><Upload size={18} strokeWidth={1.5} aria-hidden />Importar planilhas</Link>
          <Botao variante="contorno" onClick={() => baixar(false)} carregando={gerando}><span className="flex items-center justify-center" style={{ gap: 8 }}><Download size={18} strokeWidth={1.5} aria-hidden />Exportar extrato filtrado</span></Botao>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--mut)" }}>A exportação inclui receitas e despesas, respeitando o período e os filtros aplicados no Extrato.</p>
          <Botao variante="contorno" onClick={() => baixar(true)} carregando={gerando}>Baixar modelo em branco</Botao>
          {erro ? <p role="alert" style={{ color: "var(--bad)", fontSize: 13 }}>{erro}</p> : null}
          {recado ? <p role="status" style={{ color: "var(--deep)", fontSize: 13 }}>{recado}</p> : null}
        </div>
      </Folha>
    </>
  );
}
