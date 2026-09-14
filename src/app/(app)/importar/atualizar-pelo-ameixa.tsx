"use client";

import { CircleCheck, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Dinheiro } from "@/components/dinheiro";
import { Botao } from "@/components/ui/botao";
import { atualizarAgendaNaTela } from "@/lib/agenda/atualizar-na-tela";
import { dataBr, moeda } from "@/lib/formato";
import type { PlanilhaDoAmeixa } from "@/lib/planilha-ameixa-leitura";
import { compactarPlanilha } from "@/lib/planilha-compacta";
import { aplicarAtualizacao, type ResumoAtualizacao } from "./atualizar-ameixa";

type Resumo = Extract<ResumoAtualizacao, { ok: true }>;

const ROTULO_ALVO = { categoria: "Categoria", subcategoria: "Subcategoria", conta: "Conta" } as const;
const MOSTRAR = 40;

const caixa: React.CSSProperties = {
  padding: 14,
  borderRadius: "var(--r)",
  border: "1px solid var(--ln2)",
  background: "var(--sf)",
};

/** Lista curta de lançamentos (data, descrição e valor com sinal). */
function ListaDeItens({ itens, total }: { itens: Resumo["exclusoes"]["itens"]; total: number }) {
  return (
    <>
      <ul className="flex flex-col" style={{ gap: 6, marginTop: 8, fontSize: 13 }}>
        {itens.slice(0, MOSTRAR).map((i, k) => (
          <li key={`${i.data}-${i.descricao}-${k}`}>
            <span style={{ color: "var(--mut)" }}>{dataBr(i.data)} · </span>
            {i.descricao}{" "}
            <span style={{ color: i.tipo === "receita" ? "var(--ok)" : "var(--bad)" }}>
              {i.tipo === "receita" ? "+" : "−"}
              <Dinheiro>{moeda(i.valor)}</Dinheiro>
            </span>
          </li>
        ))}
      </ul>
      {total > MOSTRAR ? (
        <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>e mais {total - MOSTRAR}.</p>
      ) : null}
    </>
  );
}

/**
 * A planilha do Ameixa voltando editada: ela é a verdade. Mostra o que vai
 * mudar, o que vai entrar e o que vai sair do app, e só grava depois da
 * confirmação.
 */
export function AtualizarPeloAmeixa({
  planilha,
  resumo,
  nomeArquivo,
  aoVoltar,
}: {
  planilha: PlanilhaDoAmeixa;
  resumo: Resumo;
  nomeArquivo: string;
  aoVoltar: () => void;
}) {
  const router = useRouter();
  const compacta = useMemo(() => compactarPlanilha(planilha), [planilha]);
  const [aplicando, iniciar] = useTransition();
  const [excluir, setExcluir] = useState(true);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoAgenda, setAvisoAgenda] = useState<string | null>(null);
  const [feito, setFeito] = useState<{
    renomeados: number;
    atualizados: number;
    excluidos: number;
    criados: number;
    falhas: string[];
  } | null>(null);

  const ex = resumo.exclusoes;
  const en = resumo.entradas;
  const vaiExcluir = excluir && ex.quantidade > 0;
  const temAlgo =
    resumo.renomes.length > 0 || resumo.mudancas.length > 0 || vaiExcluir || en.quantidade > 0;

  function aplicar() {
    setErro(null);
    iniciar(async () => {
      let renomeados = 0;
      let atualizados = 0;
      let excluidos = 0;
      let criados = 0;
      const falhas = new Set<string>();

      // Em rodadas: cada chamada grava até 200 e o servidor recalcula o que
      // falta; exclusão e linhas novas acontecem na última. Para quando acaba
      // ou quando uma rodada não consegue gravar nada, para não girar à toa.
      for (let rodada = 0; rodada < 200; rodada++) {
        let r;
        try {
          r = await aplicarAtualizacao(compacta, excluir);
        } catch {
          setErro("A conexão caiu no meio. O que já foi gravado ficou; importe a planilha de novo para terminar.");
          break;
        }
        if (!r.ok) {
          setErro(r.erro);
          break;
        }
        renomeados += r.renomeados;
        atualizados += r.atualizados;
        excluidos += r.excluidos;
        criados += r.criados;
        r.falhas.forEach((f) => falhas.add(f));
        setProgresso(
          r.restantes > 0
            ? `${atualizados} de ${resumo.mudancas.length} lançamentos atualizados…`
            : "Terminando…",
        );
        if (r.restantes === 0 || (r.atualizados === 0 && r.renomeados === 0)) break;
      }

      setProgresso(null);
      setFeito({ renomeados, atualizados, excluidos, criados, falhas: [...falhas] });
      router.refresh();

      setAvisoAgenda("Atualizando o Google Agenda…");
      const restam = await atualizarAgendaNaTela();
      setAvisoAgenda(
        restam > 0
          ? `${restam} ${restam === 1 ? "compromisso ficou" : "compromissos ficaram"} na fila do Google Agenda. Em Ajustes, toque em Tentar agora.`
          : "Google Agenda atualizado.",
      );
    });
  }

  if (feito) {
    return (
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div className="flex items-start" style={{ ...caixa, gap: 10 }}>
          <CircleCheck size={20} strokeWidth={1.5} style={{ color: "var(--ok)", flexShrink: 0 }} aria-hidden />
          <div className="flex flex-col" style={{ gap: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Planilha aplicada</p>
            <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
              {feito.renomeados} {feito.renomeados === 1 ? "nome mudou" : "nomes mudaram"} ·{" "}
              {feito.atualizados} {feito.atualizados === 1 ? "lançamento atualizado" : "lançamentos atualizados"} ·{" "}
              {feito.criados} {feito.criados === 1 ? "criado" : "criados"} ·{" "}
              {feito.excluidos} {feito.excluidos === 1 ? "excluído" : "excluídos"}.
            </p>
            {avisoAgenda ? (
              <p role="status" style={{ fontSize: 12, color: "var(--mut)" }}>
                {avisoAgenda}
              </p>
            ) : null}
          </div>
        </div>

        {feito.falhas.length > 0 ? (
          <div style={caixa}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--bad)" }}>
              {feito.falhas.length} {feito.falhas.length === 1 ? "item não foi gravado" : "itens não foram gravados"}
            </p>
            <ul style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
              {feito.falhas.slice(0, MOSTRAR).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <Botao variante="contorno" onClick={aoVoltar}>
          Concluir
        </Botao>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <div>
        <h2 style={{ fontSize: 17 }}>Atualizar pela planilha do Ameixa</h2>
        <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 4, lineHeight: 1.5 }}>
          {nomeArquivo} foi gerada pelo app, então ela vale como a verdade: linhas com código
          atualizam o que já existe, linhas sem código entram como lançamentos novos, e o que está
          no app dentro do período da planilha mas não está nela sai. Confira antes de aplicar.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {[
          [resumo.renomes.length, resumo.renomes.length === 1 ? "nome muda" : "nomes mudam"],
          [resumo.mudancas.length, resumo.mudancas.length === 1 ? "lançamento muda" : "lançamentos mudam"],
          [en.quantidade, en.quantidade === 1 ? "entra no app" : "entram no app"],
          [ex.quantidade, ex.quantidade === 1 ? "sai do app" : "saem do app"],
          [resumo.semMudanca, "sem mudança"],
          [resumo.problemas.length, resumo.problemas.length === 1 ? "problema" : "problemas"],
        ].map(([n, rotulo]) => (
          <div key={String(rotulo)} style={{ ...caixa, padding: 12 }}>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{n}</p>
            <p style={{ fontSize: 12, color: "var(--mut)" }}>{rotulo}</p>
          </div>
        ))}
      </div>

      {en.quantidade > 0 ? (
        <section style={caixa}>
          <h3 className="flex items-center" style={{ fontSize: 15, gap: 6 }}>
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            Lançamentos que entram no app
          </h3>
          <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 4, lineHeight: 1.5 }}>
            Linhas sem código na planilha. Os que vierem sem categoria ficam em Pendências para
            completar.
          </p>
          <ListaDeItens itens={en.itens} total={en.quantidade} />
        </section>
      ) : null}

      {en.jaNoApp > 0 ? (
        <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
          {en.jaNoApp === 1
            ? "1 linha sem código já está no app, igual (data, valor e descrição), e não entra de novo."
            : `${en.jaNoApp} linhas sem código já estão no app, iguais (data, valor e descrição), e não entram de novo.`}
        </p>
      ) : null}

      {ex.quantidade > 0 ? (
        <section style={{ ...caixa, borderColor: excluir ? "var(--bad)" : "var(--ln2)" }}>
          <h3 className="flex items-center" style={{ fontSize: 15, gap: 6, color: "var(--bad)" }}>
            <Trash2 size={16} strokeWidth={1.5} aria-hidden />
            Lançamentos que saem do app
          </h3>
          <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 4, lineHeight: 1.5 }}>
            Estão no app entre {ex.de ? dataBr(ex.de) : "—"} e {ex.ate ? dataBr(ex.ate) : "—"}, mas não
            estão na planilha. Fora desse período nada é tocado, e aportes em metas nunca saem.
          </p>
          <ListaDeItens itens={ex.itens} total={ex.quantidade} />
          <label className="flex items-center" style={{ gap: 8, marginTop: 10, minHeight: 44, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={excluir}
              onChange={(e) => setExcluir(e.target.checked)}
              style={{ width: 18, height: 18, minHeight: 18 }}
            />
            Excluir {ex.quantidade === 1 ? "este lançamento" : `estes ${ex.quantidade} lançamentos`}
          </label>
          <p style={{ fontSize: 12, color: "var(--bad)", lineHeight: 1.5 }}>
            Excluir não tem volta — nem importando de novo o arquivo original.
          </p>
        </section>
      ) : null}

      {resumo.renomes.length > 0 ? (
        <section style={caixa}>
          <h3 style={{ fontSize: 15 }}>Nomes que mudam</h3>
          <ul className="flex flex-col" style={{ gap: 6, marginTop: 8, fontSize: 13 }}>
            {resumo.renomes.map((r) => (
              <li key={r.id}>
                <span style={{ color: "var(--mut)" }}>{ROTULO_ALVO[r.alvo]}:</span> {r.de} →{" "}
                <strong>{r.para}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {resumo.mudancas.length > 0 ? (
        <section style={caixa}>
          <h3 style={{ fontSize: 15 }}>Lançamentos que mudam</h3>
          <ul className="flex flex-col" style={{ gap: 6, marginTop: 8, fontSize: 13 }}>
            {resumo.mudancas.slice(0, MOSTRAR).map((m) => (
              <li key={`${m.linha}-${m.descricao}`}>
                <span style={{ color: "var(--mut)" }}>Linha {m.linha} · </span>
                {m.descricao} <span style={{ color: "var(--mut)" }}>— {m.campos.join(", ")}</span>
              </li>
            ))}
          </ul>
          {resumo.mudancas.length > MOSTRAR ? (
            <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>
              e mais {resumo.mudancas.length - MOSTRAR}.
            </p>
          ) : null}
        </section>
      ) : null}

      {resumo.problemas.length > 0 ? (
        <section style={caixa}>
          <h3 className="flex items-center" style={{ fontSize: 15, gap: 6, color: "var(--bad)" }}>
            <TriangleAlert size={16} strokeWidth={1.5} aria-hidden />
            O que não vai ser aplicado
          </h3>
          <ul className="flex flex-col" style={{ gap: 6, marginTop: 8, fontSize: 13 }}>
            {resumo.problemas.slice(0, MOSTRAR).map((p, i) => (
              <li key={`${p.aba}-${p.linha}-${i}`}>
                <span style={{ color: "var(--mut)" }}>
                  {p.aba}, linha {p.linha}:
                </span>{" "}
                {p.motivo}
              </li>
            ))}
          </ul>
          {resumo.problemas.length > MOSTRAR ? (
            <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>
              e mais {resumo.problemas.length - MOSTRAR}.
            </p>
          ) : null}
        </section>
      ) : null}

      {!temAlgo ? (
        <p style={{ fontSize: 14, color: "var(--mut)" }}>Nada para atualizar: a planilha está igual ao app.</p>
      ) : null}

      {progresso ? (
        <p role="status" style={{ fontSize: 13 }}>
          {progresso}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" style={{ fontSize: 13, color: "var(--bad)" }}>
          {erro}
        </p>
      ) : null}

      <div className="flex" style={{ gap: 8 }}>
        <Botao variante="contorno" onClick={aoVoltar} disabled={aplicando}>
          Voltar
        </Botao>
        {temAlgo ? (
          <Botao onClick={aplicar} carregando={aplicando}>
            {vaiExcluir ? `Aplicar e excluir ${ex.quantidade}` : "Aplicar mudanças"}
          </Botao>
        ) : null}
      </div>
    </div>
  );
}
