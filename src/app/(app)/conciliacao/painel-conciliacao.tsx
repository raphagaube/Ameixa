"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { dataBr, moeda } from "@/lib/formato";
import {
  ROTULO_CLASSIFICACAO,
  casar,
  lerOfx,
  soNoApp,
  type Classificacao,
  type LancamentoParaCasar,
  type Sugestao,
  type MovimentoOfx,
} from "@/lib/ofx";
import type { Conta } from "@/lib/tipos/contas";
import { aplicarConciliacao } from "./acoes";
import { lancamentosParaCasar } from "./buscar-lancamentos";
import { Dinheiro } from "@/components/dinheiro";

type AcaoLinha = "conciliar" | "criar" | "ignorar";

const COR_CLASSIFICACAO: Record<Classificacao, string> = {
  confere: "var(--ok)",
  provavel: "var(--warn)",
  novo: "var(--deep)",
  ja_conciliado: "var(--mut)",
};

/** A sugestão vira a ação pré-selecionada — é a fonte da verdade do que grava. */
function acaoSugerida(c: Classificacao): AcaoLinha {
  if (c === "confere" || c === "provavel") return "conciliar";
  if (c === "novo") return "criar";
  return "ignorar";
}

export function PainelConciliacao({ contas }: { contas: Conta[] }) {
  const router = useRouter();
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [acoes, setAcoes] = useState<Record<string, AcaoLinha>>({});
  const [sobra, setSobra] = useState<LancamentoParaCasar[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  // O extrato lido fica guardado: sem ele, trocar a conta depois de
  // carregar o arquivo deixaria as sugestões velhas na tela enquanto o
  // "Aplicar" gravaria na conta nova. Dado sujo, e marcado como conferido.
  const [movimentos, setMovimentos] = useState<MovimentoOfx[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setAviso(null);

    if (!contaId) {
      setErro("Escolha primeiro a conta do extrato.");
      return;
    }

    const texto = await arquivo.text();
    const movimentos = lerOfx(texto);

    if (movimentos.length === 0) {
      setErro(
        "Não encontrei movimentos nesse arquivo. Confira se é um OFX ou QFX do seu banco.",
      );
      return;
    }

    setNomeArquivo(arquivo.name);
    setMovimentos(movimentos);
    recasar(movimentos, contaId);
  }

  /** Refaz o casamento contra a conta escolhida. */
  function recasar(movs: MovimentoOfx[], conta: string) {
    if (movs.length === 0 || !conta) return;
    const datas = movs.map((m) => m.data).sort();
    iniciar(async () => {
      const lancs = await lancamentosParaCasar({
        de: datas[0],
        ate: datas[datas.length - 1],
        contaId: conta,
      });

      const s = casar(movs, lancs);
      setSugestoes(s);
      setSobra(soNoApp(lancs, s));
      setAcoes(
        Object.fromEntries(
          s.map((x) => [x.movimento.fitid, acaoSugerida(x.classificacao)]),
        ),
      );
    });
  }

  function aplicar() {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await aplicarConciliacao({
        contaId,
        itens: sugestoes.map((s) => ({
          fitid: s.movimento.fitid,
          data: s.movimento.data,
          valor: s.movimento.valor,
          descricao: s.movimento.descricao,
          saida: s.movimento.saida,
          acao: acoes[s.movimento.fitid] ?? "ignorar",
          lancamentoId: s.lancamentoId,
        })),
      });

      if (r.ok) {
        setAviso(
          `Pronto: ${r.conciliados} conciliado${r.conciliados === 1 ? "" : "s"} e ${r.criados} criado${r.criados === 1 ? "" : "s"}.`,
        );
        setSugestoes([]);
        setSobra([]);
        setNomeArquivo("");
        router.refresh();
      } else {
        setErro(r.erro);
      }
    });
  }

  const estiloSelect: React.CSSProperties = {
    padding: 12,
    fontSize: 15,
    borderRadius: "var(--rs)",
    border: "1px solid var(--ln)",
    background: "var(--sf)",
    color: "var(--color-text)",
    width: "100%",
  };

  const botaoAcao = (ativo: boolean): React.CSSProperties => ({
    minHeight: 34,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: ativo ? 700 : 500,
    background: ativo ? "var(--tint)" : "transparent",
    color: ativo ? "var(--deep)" : "var(--mut)",
    border: `1px solid ${ativo ? "var(--deep)" : "var(--ln)"}`,
  });

  const contagem = sugestoes.reduce(
    (acc, s) => {
      acc[s.classificacao] = (acc[s.classificacao] ?? 0) + 1;
      return acc;
    },
    {} as Record<Classificacao, number>,
  );

  if (contas.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--mut)", padding: "24px 0" }}>
        Cadastre um banco em Ajustes → Cartões e contas antes de conciliar.
      </p>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <label htmlFor="conta-ofx" className="rotulo">
          Conta do extrato
        </label>
        <select
          id="conta-ofx"
          value={contaId}
          onChange={(e) => {
            const nova = e.target.value;
            setContaId(nova);
            // Recalcula na hora: as sugestões são sempre da conta que está
            // escolhida agora, nunca da que estava quando o arquivo entrou.
            recasar(movimentos, nova);
          }}
          style={estiloSelect}
        >
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <label
        className="flex items-center justify-center"
        style={{
          gap: 8,
          minHeight: 52,
          borderRadius: "var(--rs)",
          border: "1px dashed var(--ln)",
          color: "var(--color-text)",
          fontSize: 14,
          cursor: "pointer",
          padding: 12,
        }}
      >
        <Upload size={18} strokeWidth={1.5} aria-hidden />
        {nomeArquivo || "Escolher arquivo OFX ou QFX"}
        <input
          type="file"
          accept=".ofx,.qfx,text/plain"
          onChange={aoEscolherArquivo}
          style={{ display: "none" }}
        />
      </label>

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

      {aviso ? (
        <p
          role="status"
          style={{
            fontSize: 13,
            background: "var(--tint)",
            borderRadius: "var(--rs)",
            padding: 12,
          }}
        >
          {aviso}
        </p>
      ) : null}

      {sugestoes.length > 0 ? (
        <>
          <ul className="flex flex-wrap" style={{ gap: 8 }}>
            {(
              ["confere", "provavel", "novo", "ja_conciliado"] as Classificacao[]
            ).map((c) =>
              contagem[c] ? (
                <li
                  key={c}
                  style={{
                    fontSize: 12,
                    borderRadius: 999,
                    padding: "3px 10px",
                    border: `1px solid ${COR_CLASSIFICACAO[c]}`,
                    color: COR_CLASSIFICACAO[c],
                  }}
                >
                  {contagem[c]} {ROTULO_CLASSIFICACAO[c]}
                </li>
              ) : null,
            )}
          </ul>

          <ul className="flex flex-col" style={{ gap: 10 }}>
            {sugestoes.map((s) => {
              const f = s.movimento.fitid;
              const escolhida = acoes[f] ?? "ignorar";
              const jaConciliado = s.classificacao === "ja_conciliado";

              return (
                <li
                  key={f}
                  style={{
                    borderRadius: "var(--r)",
                    border: "1px solid var(--ln2)",
                    background: "var(--sf)",
                    padding: "12px 14px",
                    opacity: jaConciliado ? 0.62 : 1,
                  }}
                >
                  <div className="flex items-start justify-between" style={{ gap: 8 }}>
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>
                        {s.movimento.descricao}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--mut)" }}>
                        {dataBr(s.movimento.data)}
                        {s.distanciaDias
                          ? ` · ${s.distanciaDias} dia${s.distanciaDias > 1 ? "s" : ""} de diferença`
                          : ""}
                      </p>
                    </div>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: s.movimento.saida ? "var(--bad)" : "var(--ok)",
                        flexShrink: 0,
                      }}
                    >
                      {s.movimento.saida ? "−" : "+"}
                      <Dinheiro>{moeda(s.movimento.valor)}</Dinheiro>
                    </p>
                  </div>

                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      color: COR_CLASSIFICACAO[s.classificacao],
                      marginTop: 6,
                    }}
                  >
                    {ROTULO_CLASSIFICACAO[s.classificacao]}
                  </p>

                  {jaConciliado ? (
                    <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>
                      Esse movimento já está no app. Nada será recriado.
                    </p>
                  ) : (
                    <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
                      {s.lancamentoId ? (
                        <button
                          type="button"
                          onClick={() => setAcoes({ ...acoes, [f]: "conciliar" })}
                          aria-pressed={escolhida === "conciliar"}
                          style={botaoAcao(escolhida === "conciliar")}
                        >
                          Conciliar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setAcoes({ ...acoes, [f]: "criar" })}
                        aria-pressed={escolhida === "criar"}
                        style={botaoAcao(escolhida === "criar")}
                      >
                        Criar novo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcoes({ ...acoes, [f]: "ignorar" })}
                        aria-pressed={escolhida === "ignorar"}
                        style={botaoAcao(escolhida === "ignorar")}
                      >
                        Ignorar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {sobra.length > 0 ? (
            <section
              style={{
                borderRadius: "var(--r)",
                border: "1px solid var(--ln2)",
                padding: "13px 14px",
              }}
            >
              <h2 style={{ fontSize: 15 }}>Só no app</h2>
              <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>
                Lançamentos desta conta que o extrato não trouxe. Podem ser
                erros de digitação ou algo que o banco ainda não processou.
              </p>
              <ul className="flex flex-col" style={{ gap: 6, marginTop: 10 }}>
                {sobra.map((l) => (
                  <li key={l.id} className="flex justify-between" style={{ gap: 8 }}>
                    <span className="truncate" style={{ fontSize: 13 }}>
                      {l.descricao}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--mut)", flexShrink: 0 }}>
                      {dataBr(l.data)} · <Dinheiro>{moeda(l.valor)}</Dinheiro>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Botao onClick={aplicar} carregando={processando}>
            Aplicar conciliação
          </Botao>
        </>
      ) : null}
    </div>
  );
}
