"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { editarLancamentosEmLote, type ItemEdicao } from "@/app/(app)/lancamentos/acoes";
import { Dinheiro } from "@/components/dinheiro";
import { Botao } from "@/components/ui/botao";
import { dataBr, moeda } from "@/lib/formato";
import { separarSufixo, trocarBase } from "@/lib/recorrentes";
import { dataNoPasso } from "@/lib/serie";
import {
  dataQueVale,
  ROTULO_FREQUENCIA,
  ROTULO_SITUACAO,
  situacoesDoTipo,
  type Frequencia,
  type LancamentoNaLista,
  type Situacao,
} from "@/lib/tipos/lancamentos";
import { escreverValor, lerValor } from "@/lib/valor";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** O que está escrito numa linha da tabela. Texto cru, como no formulário. */
type Linha = {
  registro: string;
  vencimento: string;
  descricao: string;
  valor: string;
  situacao: Situacao;
};

const FREQUENCIAS: Frequencia[] = ["mensal", "quinzenal", "semanal", "semestral", "anual"];

function linhaOriginal(l: LancamentoNaLista): Linha {
  return {
    registro: l.data_registro.slice(0, 10),
    vencimento: l.data_vencimento?.slice(0, 10) ?? "",
    descricao: l.descricao,
    valor: escreverValor(l.valor),
    situacao: l.situacao,
  };
}

/** Linha editada → o que vai para o banco, ou o motivo de não poder ir. */
function paraGravar(l: LancamentoNaLista, r: Linha): ItemEdicao | string {
  const descricao = r.descricao.trim();
  if (!descricao) return "Descrição vazia.";
  const valor = lerValor(r.valor);
  if (valor === null || !(valor > 0)) return "Valor inválido.";
  if (!ISO.test(r.registro)) return "Data de registro inválida.";
  if (r.vencimento && !ISO.test(r.vencimento)) return "Vencimento inválido.";
  return {
    id: l.id,
    descricao,
    valor: Math.round(valor * 100) / 100,
    data_registro: r.registro,
    data_vencimento: r.vencimento || null,
    situacao: r.situacao,
  };
}

function mudou(l: LancamentoNaLista, it: ItemEdicao) {
  return (
    it.descricao !== l.descricao ||
    it.valor !== l.valor ||
    it.data_vencimento !== (l.data_vencimento?.slice(0, 10) ?? null) ||
    it.data_registro !== l.data_registro.slice(0, 10) ||
    it.situacao !== l.situacao
  );
}

const campo: React.CSSProperties = {
  minHeight: 44,
  width: "100%",
  padding: "0 8px",
  borderRadius: "var(--rs)",
  border: "1px solid var(--ln2)",
  fontSize: 14,
  color: "var(--color-text)",
  background: "transparent",
};

const destaque: React.CSSProperties = {
  borderColor: "var(--deep)",
  background: "var(--tint)",
};

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color: "var(--mut)",
  fontWeight: 600,
  padding: "10px 8px",
  borderBottom: "1px solid var(--ln)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid var(--ln2)",
  verticalAlign: "middle",
};

const pago = (s: Situacao) => s === "pago" || s === "recebido";

/**
 * A série inteira numa tabela, da primeira à última ocorrência — inclusive
 * as já pagas.
 *
 * Cada linha é editável na hora. Para consertar uma série criada com as
 * datas erradas, acerta-se a primeira linha errada e "Datas ↓" recalcula as
 * seguintes a partir dela, no passo escolhido; "Valor ↓" e "Nome ↓" fazem o
 * mesmo com valor e nome. Tudo fica na tela até Salvar, e Desfazer grava de
 * volta o que havia antes.
 */
export function PainelSerie({
  itens,
  vinculada,
}: {
  itens: LancamentoNaLista[];
  vinculada: boolean;
}) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<Record<string, Linha>>({});
  const [frequencia, setFrequencia] = useState<Frequencia>("mensal");
  const [moverRegistro, setMoverRegistro] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);
  const [desfazer, setDesfazer] = useState<ItemEdicao[] | null>(null);
  const [gravando, iniciar] = useTransition();

  const linhaDe = (l: LancamentoNaLista) => linhas[l.id] ?? linhaOriginal(l);

  const avaliadas = itens.map((l) => {
    const r = linhas[l.id];
    if (!r) return { l, item: null as ItemEdicao | null, erro: null as string | null };
    const g = paraGravar(l, r);
    return typeof g === "string"
      ? { l, item: null, erro: g }
      : { l, item: mudou(l, g) ? g : null, erro: null };
  });
  const mudancas = avaliadas.flatMap((a) => (a.item ? [a.item] : []));
  const erros = avaliadas.filter((a) => a.erro).length;

  function mudar<K extends keyof Linha>(l: LancamentoNaLista, chave: K, valor: Linha[K]) {
    setLinhas((a) => ({ ...a, [l.id]: { ...(a[l.id] ?? linhaOriginal(l)), [chave]: valor } }));
  }

  function aplicarNasSeguintes(i: number, oque: "datas" | "valor" | "nome") {
    setLinhas((atual) => {
      const prox = { ...atual };
      const origem = prox[itens[i].id] ?? linhaOriginal(itens[i]);
      // Sem vencimento na linha de origem, a data de registro dela é a base.
      const base = origem.vencimento || origem.registro;
      if (oque === "datas") {
        if (!ISO.test(base)) return atual;
        prox[itens[i].id] = {
          ...origem,
          vencimento: base,
          ...(moverRegistro ? { registro: base } : {}),
        };
      }
      for (let j = i + 1; j < itens.length; j++) {
        const l = itens[j];
        const r = prox[l.id] ?? linhaOriginal(l);
        if (oque === "datas") {
          const data = dataNoPasso(base, j - i, frequencia);
          prox[l.id] = { ...r, vencimento: data, ...(moverRegistro ? { registro: data } : {}) };
        } else if (oque === "valor") {
          prox[l.id] = { ...r, valor: origem.valor };
        } else {
          prox[l.id] = {
            ...r,
            descricao: trocarBase(r.descricao, separarSufixo(origem.descricao).base),
          };
        }
      }
      return prox;
    });
  }

  function gravar() {
    if (mudancas.length === 0 || erros > 0) return;
    const lote = mudancas;
    iniciar(async () => {
      const antes: ItemEdicao[] = [];
      let erro: string | null = null;
      for (let k = 0; k < lote.length; k += 500) {
        const r = await editarLancamentosEmLote(lote.slice(k, k + 500));
        antes.push(...r.antes);
        if (!r.ok) {
          erro = r.erro;
          break;
        }
      }
      setDesfazer(antes.length ? antes : null);
      setRecado(
        erro ??
          (antes.length === 0
            ? "Nada mudou."
            : `${antes.length} ${antes.length === 1 ? "lançamento salvo" : "lançamentos salvos"}.`),
      );
      router.refresh();
    });
  }

  function aplicarDesfazer() {
    const antes = desfazer;
    if (!antes) return;
    iniciar(async () => {
      const r = await editarLancamentosEmLote(antes);
      const ids = new Set(antes.map((a) => a.id));
      // Os campos ainda mostram o que foi desfeito; volta a mostrar o banco.
      setLinhas((a) => Object.fromEntries(Object.entries(a).filter(([id]) => !ids.has(id))));
      setDesfazer(null);
      setRecado(r.ok ? "Desfeito." : r.erro);
      router.refresh();
    });
  }

  const pagas = itens.filter((l) => pago(l.situacao)).length;
  const somaPendente = itens
    .filter((l) => !pago(l.situacao))
    .reduce((n, l) => n + l.valor, 0);
  const onde = itens[0].cartao?.nome ?? itens[0].conta?.nome ?? null;

  const botaoMini = (desligado: boolean): React.CSSProperties => ({
    minHeight: 44,
    padding: "0 10px",
    borderRadius: "var(--rs)",
    border: "1px solid var(--ln)",
    background: "transparent",
    color: "var(--deep)",
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
    opacity: desligado ? 0.35 : 1,
  });

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
        {itens.length} {itens.length === 1 ? "lançamento" : "lançamentos"} · {pagas}{" "}
        {pagas === 1 ? "já pago" : "já pagos"} · {itens.length - pagas} pendentes, somando{" "}
        <Dinheiro>{moeda(somaPendente)}</Dinheiro> · {dataBr(dataQueVale(itens[0]))} →{" "}
        {dataBr(dataQueVale(itens[itens.length - 1]))}
        {onde ? ` · ${onde}` : ""}
      </p>

      {!vinculada ? (
        <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>
          Esta série não tem vínculo no banco — provavelmente veio de importação. Juntei os
          lançamentos que têm o mesmo nome e o mesmo valor.
        </p>
      ) : null}

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
        <p style={{ fontSize: 14, fontWeight: 600 }}>Como corrigir a série</p>
        <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
          Acerte o vencimento da primeira linha que está errada e toque em{" "}
          <strong>Datas ↓</strong>: as linhas de baixo recebem as datas a partir dela.{" "}
          <strong>Valor ↓</strong> e <strong>Nome ↓</strong> fazem o mesmo com o valor e o nome.
          Qualquer célula também pode ser editada sozinha. Nada é salvo até apertar Salvar.
        </p>
        <div className="flex flex-wrap items-center" style={{ gap: 16 }}>
          <label className="flex items-center" style={{ gap: 8, fontSize: 13 }}>
            Datas repetem a cada
            <select
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value as Frequencia)}
              style={{ ...campo, width: "auto" }}
            >
              {FREQUENCIAS.map((f) => (
                <option key={f} value={f}>
                  {ROTULO_FREQUENCIA[f]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center" style={{ gap: 8, fontSize: 13, minHeight: 44 }}>
            <input
              type="checkbox"
              checked={moverRegistro}
              onChange={(e) => setMoverRegistro(e.target.checked)}
              style={{ width: 18, height: 18, minHeight: 18 }}
            />
            A data de registro acompanha o vencimento
          </label>
        </div>
      </section>

      {recado ? (
        <div
          role="status"
          className="flex items-center justify-between"
          style={{
            gap: 10,
            padding: 12,
            borderRadius: "var(--rs)",
            background: "var(--ln2)",
            fontSize: 13,
          }}
        >
          <span>{recado}</span>
          <span className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
            {desfazer ? (
              <button
                type="button"
                onClick={aplicarDesfazer}
                disabled={gravando}
                style={{
                  minHeight: 44,
                  padding: "0 8px",
                  background: "transparent",
                  color: "var(--deep)",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Desfazer
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setRecado(null);
                setDesfazer(null);
              }}
              aria-label="Dispensar aviso"
              style={{ minHeight: 44, width: 44, background: "transparent", color: "var(--mut)" }}
            >
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </span>
        </div>
      ) : null}

      {mudancas.length > 0 || erros > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            gap: 10,
            padding: 12,
            borderRadius: "var(--rs)",
            border: "1px solid var(--deep)",
            background: "var(--sf)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {mudancas.length} {mudancas.length === 1 ? "alteração" : "alterações"} ainda não
            salvas{erros > 0 ? ` · ${erros} ${erros === 1 ? "linha com erro" : "linhas com erro"}` : ""}
          </span>
          <div className="flex" style={{ gap: 8, minWidth: 320 }}>
            <Botao variante="contorno" onClick={() => setLinhas({})} disabled={gravando}>
              Descartar
            </Botao>
            <Botao onClick={gravar} disabled={mudancas.length === 0 || erros > 0} carregando={gravando}>
              Salvar
            </Botao>
          </div>
        </div>
      ) : null}

      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--ln2)",
          borderRadius: "var(--r)",
          background: "var(--sf)",
        }}
      >
        <table style={{ width: "100%", minWidth: 1040, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 64 }}>#</th>
              <th style={{ ...th, width: 132 }}>Situação</th>
              <th style={{ ...th, width: 158 }}>Registro</th>
              <th style={{ ...th, width: 158 }}>Vencimento</th>
              <th style={th}>Descrição</th>
              <th style={{ ...th, width: 118 }}>Valor</th>
              <th style={{ ...th, width: 236 }}>Aplicar às seguintes</th>
            </tr>
          </thead>
          <tbody>
            {avaliadas.map(({ l, erro }, i) => {
              const r = linhaDe(l);
              const o = linhaOriginal(l);
              const ultima = i === itens.length - 1;
              const marca = (mudouCampo: boolean) => (mudouCampo ? destaque : null);
              return (
                <Fragment key={l.id}>
                  <tr>
                    <td style={td}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {l.parcela_atual ? `${l.parcela_atual}/${l.parcela_total}` : i + 1}
                      </span>
                      {i === 0 ? (
                        <span style={{ display: "block", fontSize: 10, color: "var(--mut)" }}>
                          primeira
                        </span>
                      ) : null}
                    </td>
                    <td style={td}>
                      <select
                        aria-label={`Situação de ${l.descricao}`}
                        value={r.situacao}
                        onChange={(e) => mudar(l, "situacao", e.target.value as Situacao)}
                        style={{ ...campo, ...marca(r.situacao !== o.situacao) }}
                      >
                        {situacoesDoTipo(l.tipo).map((s) => (
                          <option key={s} value={s}>
                            {ROTULO_SITUACAO[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        type="date"
                        aria-label={`Data de registro de ${l.descricao}`}
                        value={r.registro}
                        onChange={(e) => mudar(l, "registro", e.target.value)}
                        style={{ ...campo, ...marca(r.registro !== o.registro) }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="date"
                        aria-label={`Vencimento de ${l.descricao}`}
                        value={r.vencimento}
                        onChange={(e) => mudar(l, "vencimento", e.target.value)}
                        style={{ ...campo, ...marca(r.vencimento !== o.vencimento) }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        aria-label={`Descrição de ${l.descricao}`}
                        value={r.descricao}
                        onChange={(e) => mudar(l, "descricao", e.target.value)}
                        style={{ ...campo, ...marca(r.descricao !== o.descricao) }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        inputMode="decimal"
                        aria-label={`Valor de ${l.descricao}`}
                        value={r.valor}
                        onChange={(e) => mudar(l, "valor", e.target.value)}
                        style={{ ...campo, ...marca(r.valor !== o.valor) }}
                      />
                    </td>
                    <td style={td}>
                      <div className="flex" style={{ gap: 4 }}>
                        <button
                          type="button"
                          disabled={ultima}
                          onClick={() => aplicarNasSeguintes(i, "datas")}
                          title="Recalcular os vencimentos das linhas de baixo a partir desta"
                          style={botaoMini(ultima)}
                        >
                          Datas ↓
                        </button>
                        <button
                          type="button"
                          disabled={ultima}
                          onClick={() => aplicarNasSeguintes(i, "valor")}
                          title="Usar este valor nas linhas de baixo"
                          style={botaoMini(ultima)}
                        >
                          Valor ↓
                        </button>
                        <button
                          type="button"
                          disabled={ultima}
                          onClick={() => aplicarNasSeguintes(i, "nome")}
                          title="Usar este nome nas linhas de baixo, mantendo a numeração"
                          style={botaoMini(ultima)}
                        >
                          Nome ↓
                        </button>
                      </div>
                    </td>
                  </tr>
                  {erro ? (
                    <tr>
                      <td
                        colSpan={7}
                        role="alert"
                        style={{ padding: "0 8px 8px", fontSize: 12, color: "var(--bad)" }}
                      >
                        {erro}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
