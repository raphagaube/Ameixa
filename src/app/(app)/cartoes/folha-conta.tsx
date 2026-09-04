"use client";

import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoData } from "@/components/ui/campo-data";
import { CampoValor } from "@/components/ui/campo-valor";
import { Folha } from "@/components/ui/folha";
import { EscolhaCor, Segmentos } from "@/components/ui/segmentos";
import type { Conta, TipoConta } from "@/lib/tipos/contas";
import { dataBr, paraIso } from "@/lib/formato";
import { escreverValor, lerValor } from "@/lib/valor";
import { excluirConta, salvarConta } from "./acoes";
import { BotaoExcluir } from "@/components/ui/botao-excluir";

const CORES_BANCO = [
  "#8A05BE",
  "#FF7A00",
  "#1C5CA8",
  "#CC092F",
  "#EC7000",
  "#00A868",
  "#6E7B72",
  "#2D3E50",
];

const TIPOS = [
  { valor: "corrente" as const, texto: "Corrente" },
  { valor: "poupanca" as const, texto: "Poupança" },
  { valor: "investimento" as const, texto: "Investim." },
  { valor: "dinheiro" as const, texto: "Dinheiro" },
];

export function FolhaConta({
  conta,
  aoFechar,
}: {
  conta: Conta | null;
  aoFechar: (salvou: boolean) => void;
}) {
  const [nome, setNome] = useState(conta?.nome ?? "");
  const [tipo, setTipo] = useState<TipoConta>(conta?.tipo ?? "corrente");
  const [cor, setCor] = useState(conta?.cor ?? CORES_BANCO[0]);
  const [saldo, setSaldo] = useState(escreverValor(conta?.saldo_inicial ?? 0));
  const [conferidoEm, setConferidoEm] = useState(conta?.saldo_conferido_em ?? "");
  const [varias, setVarias] = useState(conta?.varias ?? false);
  const [qtd, setQtd] = useState(String(conta?.qtd_contas ?? 1));
  const [debito, setDebito] = useState(conta?.tem_debito ?? true);
  const [credito, setCredito] = useState(conta?.tem_credito ?? false);
  const [pix, setPix] = useState(conta?.tem_pix ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function salvar() {
    setErro(null);
    const n = lerValor(saldo);
    if (n === null) {
      setErro("Saldo inválido. Use números, como 1234,56.");
      return;
    }
    iniciar(async () => {
      const r = await salvarConta({
        id: conta?.id,
        nome,
        tipo,
        cor,
        saldo_inicial: n,
        saldo_conferido_em: conferidoEm || null,
        varias,
        qtd_contas: Number(qtd) || 1,
        tem_debito: debito,
        tem_credito: credito,
        tem_pix: pix,
      });
      if (r.ok) aoFechar(true);
      else setErro(r.erro);
    });
  }

  function excluir() {
    if (!conta) return;
    setErro(null);
    iniciar(async () => {
      const r = await excluirConta(conta.id);
      if (r.ok) aoFechar(true);
      else setErro(r.erro);
    });
  }

  const chip = (ativo: boolean): React.CSSProperties => ({
    flex: 1,
    height: 44,
    borderRadius: "var(--rs)",
    border: `1px solid ${ativo ? "var(--deep)" : "var(--ln)"}`,
    background: ativo ? "var(--tint)" : "transparent",
    color: ativo ? "var(--deep)" : "var(--color-text)",
    fontSize: 14,
    fontWeight: ativo ? 700 : 500,
  });

  return (
    <Folha
      aberta
      aoFechar={() => aoFechar(false)}
      titulo={conta ? "Editar banco" : "Novo banco"}
      alturaMaxima="92vh"
    >
      <div className="flex flex-col" style={{ gap: 16, paddingBottom: 8 }}>
        <Campo
          rotulo="Nome do banco"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={40}
        />

        <Segmentos
          rotulo="Tipo"
          opcoes={TIPOS}
          valor={tipo}
          aoEscolher={setTipo}
          colunas="1fr 1fr"
        />

        <Segmentos
          rotulo="Quantas contas nesse banco"
          opcoes={[
            { valor: "uma" as const, texto: "Uma conta" },
            { valor: "varias" as const, texto: "Mais de uma" },
          ]}
          valor={varias ? "varias" : "uma"}
          aoEscolher={(v) => setVarias(v === "varias")}
        />

        {varias ? (
          <Campo
            rotulo="Quantidade"
            type="number"
            min={1}
            max={99}
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
          />
        ) : null}

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="rotulo">Meios disponíveis</span>
          <div className="flex" style={{ gap: 8 }}>
            <button type="button" onClick={() => setDebito(!debito)} aria-pressed={debito} style={chip(debito)}>
              Débito
            </button>
            <button type="button" onClick={() => setCredito(!credito)} aria-pressed={credito} style={chip(credito)}>
              Crédito
            </button>
            <button type="button" onClick={() => setPix(!pix)} aria-pressed={pix} style={chip(pix)}>
              Pix
            </button>
          </div>
        </div>

        <div
          className="flex flex-col"
          style={{
            gap: 12,
            border: "1px solid var(--ln)",
            borderRadius: "var(--r)",
            padding: 14,
          }}
        >
          <CampoValor rotulo="Saldo" valor={saldo} aoMudar={setSaldo} />

          <CampoData
            rotulo="Conferido em"
            valor={conferidoEm}
            aoMudar={setConferidoEm}
            opcional
          />

          {conferidoEm ? (
            <p style={{ fontSize: 12, color: "var(--mut)" }}>
              O app conta só os lançamentos <strong>depois</strong> de{" "}
              {dataBr(conferidoEm)}. O que veio antes continua nos relatórios,
              mas não mexe neste saldo. Use quando você tem o saldo de hoje mas
              não tem o histórico completo de entradas.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "var(--mut)" }}>
                Sem data, este valor vale como o saldo <strong>antes</strong> do
                primeiro lançamento, e o app soma tudo por cima dele.
              </p>
              <button
                type="button"
                onClick={() => setConferidoEm(paraIso(new Date()))}
                style={{
                  minHeight: 44,
                  alignSelf: "flex-start",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--deep)",
                  background: "transparent",
                }}
              >
                Este é o meu saldo de hoje
              </button>
            </>
          )}
        </div>

        <EscolhaCor cor={cor} aoEscolher={setCor} atalhos={CORES_BANCO} />

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

        {conta ? (
          <BotaoExcluir
            rotulo="Excluir banco"
            oQueSePerde="O banco e todos os cartões dele. Os lançamentos continuam existindo, mas ficam sem conta."
            aoConfirmar={excluir}
            carregando={salvando}
          />
        ) : null}
      </div>
    </Folha>
  );
}
