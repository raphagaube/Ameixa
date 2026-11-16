"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Segmentos } from "@/components/ui/segmentos";
import { hojeEmBrasilia, paraIso, dataBr } from "@/lib/formato";
import { filtroExclusao, TAMANHO_LOTE_EXCLUSAO, type FiltroExclusao } from "@/lib/exclusao-lancamentos";
import { atualizarAgendaNaTela } from "@/lib/agenda/atualizar-na-tela";
import { prepararExclusao, excluirLoteConfirmado } from "./exclusao";
import { ExportarDados } from "./exportar-dados";

type Previa = { filtro: FiltroExclusao; ids: string[]; ateCriadoEm: string };
const quantidade = (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? "lançamento" : "lançamentos"}`;

export function ApagarLancamentos() {
  const router = useRouter();
  const hoje = paraIso(hojeEmBrasilia());
  const [alcance, setAlcance] = useState<"todos" | "periodo">("periodo");
  const [de, setDe] = useState(`${hoje.slice(0, 8)}01`);
  const [ate, setAte] = useState(hoje);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function limparPrevia() {
    setPrevia(null);
    setErro(null);
    setRecado(null);
    setAviso(null);
  }

  async function conferir() {
    if (trava.current) return;
    limparPrevia();
    const f = filtroExclusao.safeParse(alcance === "todos" ? { alcance } : { alcance, de, ate });
    if (!f.success) { setErro(f.error.issues[0]?.message ?? "Confira as datas."); return; }
    trava.current = true;
    setOcupado(true);
    try {
      const ids = new Set<string>();
      let cursor: { ateCriadoEm: string; apos: string } | undefined;
      let corte = "";
      do {
        const r = await prepararExclusao(f.data, cursor);
        if (!r.ok) { setErro(r.erro); setRecado(null); return; }
        for (const id of r.ids) ids.add(id);
        corte = r.ateCriadoEm;
        setRecado(`Conferindo ${quantidade(ids.size)}…`);
        if (r.proxima && r.proxima === cursor?.apos) throw new Error("Paginação interrompida");
        cursor = r.proxima ? { ateCriadoEm: corte, apos: r.proxima } : undefined;
      } while (cursor);
      setRecado(ids.size ? null : "Nenhum lançamento encontrado para esta seleção.");
      if (ids.size) setPrevia({ filtro: f.data, ids: [...ids], ateCriadoEm: corte });
    } catch {
      setRecado(null);
      setErro("Não foi possível concluir a conferência. Tente novamente.");
    } finally { trava.current = false; setOcupado(false); }
  }

  async function confirmar() {
    if (!previa || trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro(null);
    let excluidos = 0;
    let ignorados = 0;
    let avisoAgenda = false;
    try {
      for (let i = 0; i < previa.ids.length; i += TAMANHO_LOTE_EXCLUSAO) {
        const r = await excluirLoteConfirmado(previa.filtro, previa.ids.slice(i, i + TAMANHO_LOTE_EXCLUSAO), previa.ateCriadoEm);
        if (!r.ok) {
          setErro(`${quantidade(excluidos)} excluídos até agora. ${r.erro}`);
          return;
        }
        excluidos += r.excluidos;
        ignorados += r.ignorados;
        avisoAgenda ||= r.avisoAgenda;
        setRecado(`${quantidade(excluidos)} excluídos de ${previa.ids.length.toLocaleString("pt-BR")} selecionados…`);
      }
      setRecado(`${quantidade(excluidos)} ${excluidos === 1 ? "excluído" : "excluídos"}.`);
      const avisos = ignorados ? [`${quantidade(ignorados)} ${ignorados === 1 ? "preservado" : "preservados"} por mudanças depois da conferência.`] : [];
      if (avisoAgenda) {
        avisos.push("Alguns compromissos não puderam entrar na fila do Google Agenda. Confira-os no Google Agenda.");
      } else {
        void atualizarAgendaNaTela().then((restam) => {
          if (restam) setAviso("Há compromissos aguardando atualização. Em Google Agenda, toque em Tentar agora.");
        });
      }
      if (avisos.length) setAviso(avisos.join(" "));
    } catch {
      setErro(`A conexão foi interrompida. ${quantidade(excluidos)} já tiveram a exclusão confirmada. A última solicitação pode ter sido concluída; confira novamente antes de tentar.`);
    } finally {
      setPrevia(null);
      trava.current = false;
      setOcupado(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }} aria-busy={ocupado}>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--mut)" }}>
        Exclua receitas, despesas e valores guardados em metas, pagos ou pendentes.
        Bancos, cartões, categorias e configurações ficam preservados. Os saldos e o progresso das metas serão recalculados.
      </p>
      <ExportarDados />
      <fieldset disabled={ocupado} className="flex flex-col" style={{ gap: 12, minWidth: 0 }}>
        <Segmentos
          rotulo="O que deseja apagar"
          opcoes={[{ valor: "periodo" as const, texto: "Escolher período" }, { valor: "todos" as const, texto: "Todo o histórico" }]}
          valor={alcance}
          aoEscolher={(v) => { limparPrevia(); setAlcance(v); }}
        />
        {alcance === "periodo" ? (
          <>
            <p style={{ fontSize: 12, color: "var(--mut)" }}>Período pela <strong>data do registro</strong>, incluindo as duas datas.</p>
            <Campo rotulo="Data inicial" type="date" value={de} onChange={(e) => { limparPrevia(); setDe(e.target.value); }} />
            <Campo rotulo="Data final" type="date" value={ate} onChange={(e) => { limparPrevia(); setAte(e.target.value); }} />
          </>
        ) : null}
      </fieldset>

      {previa ? (
        <section aria-label="Confirmação da exclusão" className="flex flex-col" style={{ gap: 12, padding: 14, border: "1px solid var(--bad)", borderRadius: "var(--rs)" }}>
          <h3 style={{ fontSize: 17 }}>Excluir {quantidade(previa.ids.length)}?</h3>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            {previa.filtro.alcance === "todos" ? "Todo o histórico de lançamentos da sua conta." : `Registros de ${dataBr(previa.filtro.de)} até ${dataBr(previa.filtro.ate)}, inclusive.`}
            {" "}<strong>Esta ação é definitiva e não pode ser desfeita.</strong>
          </p>
          <Botao variante="contorno" onClick={limparPrevia} disabled={ocupado}>Cancelar</Botao>
          <Botao onClick={confirmar} carregando={ocupado} style={{ background: "var(--bad)", color: "var(--color-bg)", fontSize: 14, letterSpacing: ".03em" }}>
            Excluir {quantidade(previa.ids.length)}
          </Botao>
        </section>
      ) : (
        <Botao variante="contorno" onClick={conferir} carregando={ocupado}>Conferir lançamentos</Botao>
      )}
      {recado ? <p role="status" style={{ fontSize: 13, lineHeight: 1.5 }}>{recado}</p> : null}
      {aviso ? <p role="status" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--mut)" }}>{aviso}</p> : null}
      {erro ? <p role="alert" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--bad)" }}>{erro}</p> : null}
    </div>
  );
}
