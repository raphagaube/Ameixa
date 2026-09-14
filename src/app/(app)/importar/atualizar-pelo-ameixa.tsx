"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { atualizarAgendaNaTela } from "@/lib/agenda/atualizar-na-tela";
import type { LinhaCru } from "@/lib/csv";
import type { PlanilhaDoAmeixa } from "@/lib/planilha-ameixa-leitura";
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

/**
 * A planilha do Ameixa voltando editada: mostra tudo o que vai mudar e só
 * grava depois da confirmação.
 */
export function AtualizarPeloAmeixa({
  planilha,
  resumo,
  nomeArquivo,
  aoVoltar,
  aoImportarNovas,
}: {
  planilha: PlanilhaDoAmeixa;
  resumo: Resumo;
  nomeArquivo: string;
  aoVoltar: () => void;
  aoImportarNovas: (linhas: LinhaCru[]) => void;
}) {
  const router = useRouter();
  const [aplicando, iniciar] = useTransition();
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoAgenda, setAvisoAgenda] = useState<string | null>(null);
  const [feito, setFeito] = useState<{
    renomeados: number;
    atualizados: number;
    falhas: string[];
    novas: LinhaCru[];
  } | null>(null);

  const temAlgo = resumo.renomes.length > 0 || resumo.mudancas.length > 0;

  function aplicar() {
    setErro(null);
    iniciar(async () => {
      let renomeados = 0;
      let atualizados = 0;
      const falhas = new Set<string>();
      let novas: LinhaCru[] = [];

      // Em rodadas: cada chamada grava até 200 e o servidor recalcula o que
      // falta. Para quando acaba ou quando uma rodada não consegue gravar
      // nada, para não girar à toa em cima de uma linha que sempre falha.
      for (let rodada = 0; rodada < 200; rodada++) {
        const r = await aplicarAtualizacao(planilha);
        if (!r.ok) {
          setErro(r.erro);
          break;
        }
        renomeados += r.renomeados;
        atualizados += r.atualizados;
        r.falhas.forEach((f) => falhas.add(f));
        novas = r.novas;
        setProgresso(
          `${atualizados} de ${resumo.mudancas.length} ${resumo.mudancas.length === 1 ? "lançamento atualizado" : "lançamentos atualizados"}…`,
        );
        if (r.restantes === 0 || (r.atualizados === 0 && r.renomeados === 0)) break;
      }

      setProgresso(null);
      setFeito({ renomeados, atualizados, falhas: [...falhas], novas });
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
              {feito.atualizados} {feito.atualizados === 1 ? "lançamento atualizado" : "lançamentos atualizados"}.
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

        {feito.novas.length > 0 ? (
          <div className="flex flex-col" style={{ ...caixa, gap: 8 }}>
            <p style={{ fontSize: 14 }}>
              A planilha tem {feito.novas.length} {feito.novas.length === 1 ? "linha sem código" : "linhas sem código"}, que{" "}
              {feito.novas.length === 1 ? "ainda não existe" : "ainda não existem"} no app.
            </p>
            <Botao onClick={() => aoImportarNovas(feito.novas)}>
              Importar {feito.novas.length === 1 ? "a linha nova" : `as ${feito.novas.length} linhas novas`}
            </Botao>
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
          {nomeArquivo} foi gerada pelo app, então as linhas com código atualizam o que já existe.
          Confira antes de aplicar.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {[
          [resumo.renomes.length, resumo.renomes.length === 1 ? "nome muda" : "nomes mudam"],
          [resumo.mudancas.length, resumo.mudancas.length === 1 ? "lançamento muda" : "lançamentos mudam"],
          [resumo.semMudanca, "sem mudança"],
          [resumo.novas, resumo.novas === 1 ? "linha nova" : "linhas novas"],
          [resumo.problemas.length, resumo.problemas.length === 1 ? "problema" : "problemas"],
        ].map(([n, rotulo]) => (
          <div key={String(rotulo)} style={{ ...caixa, padding: 12 }}>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{n}</p>
            <p style={{ fontSize: 12, color: "var(--mut)" }}>{rotulo}</p>
          </div>
        ))}
      </div>

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
        <p style={{ fontSize: 14, color: "var(--mut)" }}>
          Nada para atualizar: a planilha está igual ao app
          {resumo.novas > 0 ? ", fora as linhas novas" : ""}.
        </p>
      ) : null}

      <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>
        Linhas apagadas da planilha não apagam nada no app. Para voltar atrás, importe de novo o
        arquivo original, sem edição.
      </p>

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
            Aplicar mudanças
          </Botao>
        ) : resumo.novas > 0 ? (
          <Botao
            onClick={() =>
              aoImportarNovas(planilha.lancamentos.filter((l) => !l.codigo).map((l) => l.cru))
            }
          >
            Importar as linhas novas
          </Botao>
        ) : null}
      </div>
    </div>
  );
}
