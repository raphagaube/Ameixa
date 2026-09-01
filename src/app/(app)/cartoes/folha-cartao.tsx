"use client";

import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoValor } from "@/components/ui/campo-valor";
import { Folha } from "@/components/ui/folha";
import { EscolhaCor, Segmentos } from "@/components/ui/segmentos";
import type { Cartao, Conta } from "@/lib/tipos/contas";
import { escreverValor, lerValor } from "@/lib/valor";
import { excluirCartao, salvarCartao } from "./acoes";

const CORES_CARTAO = [
  "#8A05BE",
  "#FF7A00",
  "#1C5CA8",
  "#CC092F",
  "#111318",
  "#00A868",
  "#B8862A",
  "#4A4A4A",
];

const BANDEIRAS = [
  { valor: "Mastercard", texto: "Master" },
  { valor: "Visa", texto: "Visa" },
  { valor: "Elo", texto: "Elo" },
  { valor: "Amex", texto: "Amex" },
];

export function FolhaCartao({
  cartao,
  contas,
  aoFechar,
}: {
  cartao: Cartao | null;
  contas: Conta[];
  aoFechar: (salvou: boolean) => void;
}) {
  const [nome, setNome] = useState(cartao?.nome ?? "");
  const [contaId, setContaId] = useState(cartao?.conta_id ?? contas[0]?.id ?? "");
  const [bandeira, setBandeira] = useState(cartao?.bandeira ?? "Mastercard");
  const [final, setFinal] = useState(cartao?.final ?? "");
  const [cor, setCor] = useState(cartao?.cor ?? CORES_CARTAO[0]);
  const [limite, setLimite] = useState(escreverValor(cartao?.limite ?? 0));
  const [fechamento, setFechamento] = useState(String(cartao?.dia_fechamento ?? 28));
  const [vencimento, setVencimento] = useState(String(cartao?.dia_vencimento ?? 5));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function salvar() {
    setErro(null);
    const n = lerValor(limite);
    if (n === null) {
      setErro("Limite inválido. Use números, como 5000,00.");
      return;
    }
    iniciar(async () => {
      const r = await salvarCartao({
        id: cartao?.id,
        conta_id: contaId,
        nome,
        bandeira,
        final: final.trim(),
        cor,
        limite: n,
        dia_fechamento: Number(fechamento),
        dia_vencimento: Number(vencimento),
      });
      if (r.ok) aoFechar(true);
      else setErro(r.erro);
    });
  }

  function excluir() {
    if (!cartao) return;
    setErro(null);
    iniciar(async () => {
      const r = await excluirCartao(cartao.id);
      if (r.ok) aoFechar(true);
      else setErro(r.erro);
    });
  }

  return (
    <Folha
      aberta
      aoFechar={() => aoFechar(false)}
      titulo={cartao ? "Editar cartão" : "Novo cartão de crédito"}
      alturaMaxima="92vh"
    >
      <div className="flex flex-col" style={{ gap: 16, paddingBottom: 8 }}>
        <Campo
          rotulo="Nome do cartão"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={40}
          placeholder="Ex.: Nubank Mastercard"
        />

        <div className="flex flex-col" style={{ gap: 6 }}>
          <label htmlFor="banco-cartao" className="rotulo">
            Banco
          </label>
          <select
            id="banco-cartao"
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
            style={{
              padding: 12,
              fontSize: 15,
              borderRadius: "var(--rs)",
              border: "1px solid var(--ln)",
              background: "var(--sf)",
              color: "var(--color-text)",
            }}
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <Segmentos
          rotulo="Bandeira"
          opcoes={BANDEIRAS}
          valor={bandeira}
          aoEscolher={setBandeira}
          colunas="1fr 1fr"
        />

        <Campo
          rotulo="4 últimos dígitos"
          value={final}
          onChange={(e) => setFinal(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="0000"
        />

        <CampoValor rotulo="Limite" valor={limite} aoMudar={setLimite} />

        <div className="grid grid-cols-2" style={{ gap: 12 }}>
          <Campo
            rotulo="Dia do fechamento"
            type="number"
            min={1}
            max={31}
            value={fechamento}
            onChange={(e) => setFechamento(e.target.value)}
          />
          <Campo
            rotulo="Dia do vencimento"
            type="number"
            min={1}
            max={31}
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
          />
        </div>

        <EscolhaCor rotulo="Cor do cartão" cor={cor} aoEscolher={setCor} atalhos={CORES_CARTAO} />

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

        {cartao ? (
          <Botao
            variante="contorno"
            onClick={excluir}
            carregando={salvando}
            style={{ color: "var(--bad)", borderColor: "var(--bad)" }}
          >
            Excluir cartão
          </Botao>
        ) : null}
      </div>
    </Folha>
  );
}
