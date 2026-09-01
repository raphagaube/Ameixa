"use client";

import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoValor } from "@/components/ui/campo-valor";
import { Folha } from "@/components/ui/folha";
import { Segmentos } from "@/components/ui/segmentos";
import type { Conta } from "@/lib/tipos/contas";
import { APLICACOES, ROTULO_PRAZO, type Meta, type UnidadePrazo } from "@/lib/tipos/metas";
import { escreverValor, lerValor } from "@/lib/valor";
import { excluirMeta, salvarMeta } from "./acoes";

export function FolhaMeta({
  meta,
  contas,
  aoFechar,
}: {
  meta: Meta | null;
  contas: Conta[];
  aoFechar: (salvou: boolean) => void;
}) {
  const [nome, setNome] = useState(meta?.nome ?? "");
  const [alvo, setAlvo] = useState(escreverValor(meta?.alvo ?? 0));
  const [guardado, setGuardado] = useState(escreverValor(meta?.guardado ?? 0));
  const [contaId, setContaId] = useState<string | null>(meta?.conta_id ?? null);
  const [aplicacao, setAplicacao] = useState(meta?.aplicacao ?? "Poupança");
  const [temPrazo, setTemPrazo] = useState(meta?.tem_prazo ?? false);
  const [prazoN, setPrazoN] = useState(String(meta?.prazo_n ?? 12));
  const [unidade, setUnidade] = useState<UnidadePrazo>(meta?.prazo_unidade ?? "meses");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function salvar() {
    setErro(null);
    const a = lerValor(alvo);
    const g = lerValor(guardado);
    if (a === null || a <= 0) {
      setErro("Digite quanto você quer juntar.");
      return;
    }
    if (g === null || g < 0) {
      setErro("Quanto já guardei precisa ser um valor válido.");
      return;
    }

    iniciar(async () => {
      const r = await salvarMeta({
        id: meta?.id,
        nome,
        alvo: a,
        guardado: g,
        conta_id: contaId,
        aplicacao,
        tem_prazo: temPrazo,
        prazo_n: temPrazo ? Number(prazoN) || 1 : null,
        prazo_unidade: temPrazo ? unidade : null,
      });
      if (r.ok) aoFechar(true);
      else setErro(r.erro);
    });
  }

  function excluir() {
    if (!meta) return;
    setErro(null);
    iniciar(async () => {
      const r = await excluirMeta(meta.id);
      if (r.ok) aoFechar(true);
      else setErro(r.erro);
    });
  }

  return (
    <Folha
      aberta
      aoFechar={() => aoFechar(false)}
      titulo={meta ? "Editar meta" : "Nova meta"}
      alturaMaxima="92vh"
    >
      <div className="flex flex-col" style={{ gap: 16, paddingBottom: 8 }}>
        <Campo
          rotulo="Nome da meta"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={60}
          placeholder="Ex.: Reserva de emergência"
        />

        <CampoValor rotulo="Quanto quero juntar" valor={alvo} aoMudar={setAlvo} />
        <CampoValor rotulo="Quanto já guardei" valor={guardado} aoMudar={setGuardado} />

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="rotulo">Onde está guardado</span>
          {contas.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mut)" }}>
              Cadastre um banco em Ajustes → Cartões e contas.
            </p>
          ) : (
            <div className="grid grid-cols-2" style={{ gap: 8 }}>
              {contas.map((c) => {
                const ativo = contaId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setContaId(ativo ? null : c.id)}
                    aria-pressed={ativo}
                    style={{
                      height: 44,
                      borderRadius: "var(--rs)",
                      border: `1px solid ${ativo ? c.cor : "var(--ln)"}`,
                      background: ativo ? c.cor : "transparent",
                      color: ativo ? "#ffffff" : "var(--color-text)",
                      fontSize: 14,
                      fontWeight: ativo ? 700 : 500,
                    }}
                  >
                    {c.nome}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Segmentos
          rotulo="Tipo de aplicação"
          opcoes={APLICACOES.map((a) => ({ valor: a, texto: a }))}
          valor={aplicacao as (typeof APLICACOES)[number]}
          aoEscolher={setAplicacao}
          colunas="1fr 1fr"
        />

        <Segmentos
          rotulo="Prazo"
          opcoes={[
            { valor: "sem" as const, texto: "Sem prazo" },
            { valor: "com" as const, texto: "Com prazo" },
          ]}
          valor={temPrazo ? "com" : "sem"}
          aoEscolher={(v) => setTemPrazo(v === "com")}
        />

        {temPrazo ? (
          <div className="grid" style={{ gridTemplateColumns: "96px 1fr", gap: 12 }}>
            <Campo
              rotulo="Quanto"
              type="number"
              min={1}
              max={999}
              value={prazoN}
              onChange={(e) => setPrazoN(e.target.value)}
            />
            <div className="flex flex-col" style={{ gap: 6 }}>
              <label htmlFor="unidade-prazo" className="rotulo">
                Unidade
              </label>
              <select
                id="unidade-prazo"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value as UnidadePrazo)}
                style={{
                  padding: 12,
                  fontSize: 15,
                  borderRadius: "var(--rs)",
                  border: "1px solid var(--ln)",
                  background: "var(--sf)",
                  color: "var(--color-text)",
                }}
              >
                {(["dias", "semanas", "meses", "anos"] as UnidadePrazo[]).map((u) => (
                  <option key={u} value={u}>
                    {ROTULO_PRAZO[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {erro ? (
          <p
            role="alert"
            style={{
              fontSize: 13,
              color: "var(--bad)",
              borderLeft: "3px solid var(--bad)",
              paddingLeft: 10,
            }}
          >
            {erro}
          </p>
        ) : null}

        <Botao onClick={salvar} carregando={salvando}>
          Salvar
        </Botao>

        {meta ? (
          <Botao
            variante="contorno"
            onClick={excluir}
            carregando={salvando}
            style={{ color: "var(--bad)", borderColor: "var(--bad)" }}
          >
            Excluir meta
          </Botao>
        ) : null}
      </div>
    </Folha>
  );
}
