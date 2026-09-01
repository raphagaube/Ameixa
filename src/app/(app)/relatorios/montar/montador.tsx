"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/botao";
import { CampoData } from "@/components/ui/campo-data";
import { Segmentos } from "@/components/ui/segmentos";
import { paraIso } from "@/lib/formato";

type Alcance = "mes" | "tres" | "ano" | "livre" | "tudo";

export const SECOES = [
  { chave: "resumo", texto: "Resumo" },
  { chave: "categorias", texto: "Gastos por categoria" },
  { chave: "evolucao", texto: "Evolução mensal" },
  { chave: "receitas", texto: "Origem das receitas" },
  { chave: "detalhes", texto: "Lançamentos detalhados" },
  { chave: "orcamentos", texto: "Orçamentos" },
  { chave: "metas", texto: "Metas" },
] as const;

export const SITUACOES = [
  { chave: "pago", texto: "Pago" },
  { chave: "a_pagar", texto: "A pagar" },
  { chave: "recebido", texto: "Recebido" },
  { chave: "a_receber", texto: "A receber" },
] as const;

/**
 * Armadilha nº 6 do handoff: o período tem que virar um intervalo de datas
 * concreto aqui, não um rótulo. O documento recebe de/até já resolvidos.
 */
function intervalo(alcance: Alcance, ano: number, mes: number, de: string, ate: string) {
  const hoje = new Date();
  if (alcance === "mes") {
    return {
      de: paraIso(new Date(ano, mes, 1)),
      ate: paraIso(new Date(ano, mes + 1, 0)),
    };
  }
  if (alcance === "tres") {
    return {
      de: paraIso(new Date(ano, mes - 2, 1)),
      ate: paraIso(new Date(ano, mes + 1, 0)),
    };
  }
  if (alcance === "ano") {
    return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
  }
  if (alcance === "tudo") {
    return { de: "2000-01-01", ate: paraIso(new Date(hoje.getFullYear() + 5, 11, 31)) };
  }
  return de <= ate ? { de, ate } : { de: ate, ate: de };
}

export function MontadorRelatorio({ ano, mes }: { ano: number; mes: number }) {
  const router = useRouter();

  const [alcance, setAlcance] = useState<Alcance>("mes");
  const [de, setDe] = useState(paraIso(new Date(ano, mes, 1)));
  const [ate, setAte] = useState(paraIso(new Date(ano, mes + 1, 0)));
  const [secoes, setSecoes] = useState<string[]>([
    "resumo",
    "categorias",
    "evolucao",
    "receitas",
  ]);
  const [situacoes, setSituacoes] = useState<string[]>([
    "pago",
    "a_pagar",
    "recebido",
    "a_receber",
  ]);
  const [ocultar, setOcultar] = useState(false);
  const [tecnicos, setTecnicos] = useState(true);

  function alternar(lista: string[], set: (v: string[]) => void, chave: string) {
    set(lista.includes(chave) ? lista.filter((x) => x !== chave) : [...lista, chave]);
  }

  function gerar() {
    const { de: d1, ate: d2 } = intervalo(alcance, ano, mes, de, ate);
    const q = new URLSearchParams({
      de: d1,
      ate: d2,
      secoes: secoes.join(","),
      situacoes: situacoes.join(","),
      ocultar: ocultar ? "1" : "0",
      tecnicos: tecnicos ? "1" : "0",
    });
    router.push(`/relatorios/documento?${q.toString()}`);
  }

  const caixa = (ativo: boolean): React.CSSProperties => ({
    minHeight: 40,
    borderRadius: "var(--rs)",
    padding: "9px 14px",
    fontSize: 14,
    textAlign: "left",
    fontWeight: ativo ? 700 : 500,
    background: ativo ? "var(--tint)" : "transparent",
    color: ativo ? "var(--deep)" : "var(--color-text)",
    border: `1px solid ${ativo ? "var(--deep)" : "var(--ln)"}`,
  });

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      <Segmentos
        rotulo="Período"
        opcoes={[
          { valor: "mes" as const, texto: "Este mês" },
          { valor: "tres" as const, texto: "Últimos 3 meses" },
          { valor: "ano" as const, texto: "Ano" },
          { valor: "livre" as const, texto: "Período livre" },
          { valor: "tudo" as const, texto: "Todo o período" },
        ]}
        valor={alcance}
        aoEscolher={setAlcance}
        colunas="1fr 1fr"
      />

      {alcance === "livre" ? (
        <div className="flex flex-col" style={{ gap: 10 }}>
          <CampoData rotulo="De" valor={de} aoMudar={setDe} />
          <CampoData rotulo="Até" valor={ate} aoMudar={setAte} />
        </div>
      ) : null}

      <div className="flex flex-col" style={{ gap: 6 }}>
        <span className="rotulo">Seções do relatório</span>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {SECOES.map((s) => (
            <button
              key={s.chave}
              type="button"
              onClick={() => alternar(secoes, setSecoes, s.chave)}
              aria-pressed={secoes.includes(s.chave)}
              style={caixa(secoes.includes(s.chave))}
            >
              {secoes.includes(s.chave) ? "✓ " : ""}
              {s.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 6 }}>
        <span className="rotulo">Situação dos lançamentos</span>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {SITUACOES.map((s) => (
            <button
              key={s.chave}
              type="button"
              onClick={() => alternar(situacoes, setSituacoes, s.chave)}
              aria-pressed={situacoes.includes(s.chave)}
              style={caixa(situacoes.includes(s.chave))}
            >
              {situacoes.includes(s.chave) ? "✓ " : ""}
              {s.texto}
            </button>
          ))}
        </div>
      </div>

      <Segmentos
        rotulo="Valores"
        opcoes={[
          { valor: "mostrar" as const, texto: "Mostrar valores" },
          { valor: "ocultar" as const, texto: "Ocultar valores" },
        ]}
        valor={ocultar ? "ocultar" : "mostrar"}
        aoEscolher={(v) => setOcultar(v === "ocultar")}
      />

      <Segmentos
        rotulo="Detalhamento"
        opcoes={[
          { valor: "tecnicos" as const, texto: "Com dados técnicos" },
          { valor: "essencial" as const, texto: "Só o essencial" },
        ]}
        valor={tecnicos ? "tecnicos" : "essencial"}
        aoEscolher={(v) => setTecnicos(v === "tecnicos")}
      />

      <Botao onClick={gerar} disabled={secoes.length === 0}>
        Gerar relatório
      </Botao>
      {secoes.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--mut)" }}>
          Escolha ao menos uma seção.
        </p>
      ) : null}
    </div>
  );
}
