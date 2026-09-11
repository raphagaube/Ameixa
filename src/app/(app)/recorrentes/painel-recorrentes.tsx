"use client";

import { ChevronDown, ChevronRight, Search, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  editarLancamentosEmLote,
  excluirPendentesEmLote,
  type ItemEdicao,
} from "@/app/(app)/lancamentos/acoes";
import { Dinheiro } from "@/components/dinheiro";
import { Botao } from "@/components/ui/botao";
import { moeda, nomeMes } from "@/lib/formato";
import { trocarBase, type Serie } from "@/lib/recorrentes";
import {
  dataQueVale,
  trocarDiaDoMes,
  type LancamentoNaLista,
} from "@/lib/tipos/lancamentos";
import { escreverValor, lerValor } from "@/lib/valor";

/** O que está escrito nos campos de uma linha. Texto cru, como no formulário. */
type Linha = { descricao: string; valor: string; dia: string };
/** Os campos do topo do cartão, que preenchem a série inteira. */
type Topo = { base: string; valor: string; dia: string };

const diaDe = (l: LancamentoNaLista) => Number(dataQueVale(l).slice(8, 10));

function mesCurto(iso: string) {
  const m = Number(iso.slice(5, 7)) - 1;
  return `${nomeMes(m).slice(0, 3).toLowerCase()}/${iso.slice(2, 4)}`;
}

function linhaOriginal(l: LancamentoNaLista): Linha {
  return {
    descricao: l.descricao,
    valor: escreverValor(l.valor),
    dia: String(diaDe(l)),
  };
}

function topoOriginal(s: Serie): Topo {
  const valores = new Set(s.itens.map((l) => l.valor.toFixed(2)));
  const dias = new Set(s.itens.map(diaDe));
  return {
    base: s.base,
    valor: valores.size === 1 ? escreverValor(s.itens[0].valor) : "",
    dia: dias.size === 1 ? String([...dias][0]) : "",
  };
}

/** Linha editada → o que vai para o banco, ou o motivo de não poder ir. */
function paraGravar(l: LancamentoNaLista, r: Linha): ItemEdicao | string {
  const descricao = r.descricao.trim();
  if (!descricao) return "Descrição vazia.";
  const valor = lerValor(r.valor);
  if (valor === null || !(valor > 0)) return "Valor inválido.";
  const dia = Number(r.dia);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) return "Dia entre 1 e 31.";

  // Dia intocado mantém o vencimento como estava — inclusive vazio. Só quem
  // teve o dia mudado ganha um vencimento, no mês em que já cai.
  const data_vencimento =
    dia === diaDe(l)
      ? (l.data_vencimento?.slice(0, 10) ?? null)
      : trocarDiaDoMes(dataQueVale(l), dia);

  return { id: l.id, descricao, valor: Math.round(valor * 100) / 100, data_vencimento };
}

function mudou(l: LancamentoNaLista, it: ItemEdicao) {
  return (
    it.descricao !== l.descricao ||
    it.valor !== l.valor ||
    it.data_vencimento !== (l.data_vencimento?.slice(0, 10) ?? null)
  );
}

const estiloCampo: React.CSSProperties = {
  minHeight: 44,
  width: "100%",
  padding: "0 10px",
  borderRadius: "var(--rs)",
  border: "1px solid var(--ln2)",
  fontSize: 16,
  color: "var(--color-text)",
  background: "transparent",
};

const destaque: React.CSSProperties = {
  borderColor: "var(--deep)",
  background: "var(--tint)",
};

/**
 * Corrigir contas recorrentes sem abrir uma por uma.
 *
 * Um cartão por série. Os campos do topo valem para a série inteira: mudar
 * o dia ali reescreve o dia de todos os meses na tela, e o dono confere
 * antes de salvar. Aberto, o cartão mostra cada mês com dia, descrição e
 * valor editáveis — é a planilha, sem sair da tela.
 *
 * Nada vai ao banco até apertar Salvar. Salvar devolve o que havia antes,
 * e Desfazer grava isso de volta.
 */
export function PainelRecorrentes({
  series,
  repetidas,
}: {
  series: Serie[];
  repetidas: Record<string, string[]>;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [soRepetidas, setSoRepetidas] = useState(false);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [topos, setTopos] = useState<Record<string, Topo>>({});
  const [linhas, setLinhas] = useState<Record<string, Linha>>({});
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [desfazer, setDesfazer] = useState<ItemEdicao[] | null>(null);
  const [gravando, iniciar] = useTransition();

  const visiveis = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase("pt-BR");
    return series.filter(
      (s) =>
        (!soRepetidas || repetidas[s.chave]) &&
        (!q ||
          s.base.toLocaleLowerCase("pt-BR").includes(q) ||
          s.itens.some((l) => l.descricao.toLocaleLowerCase("pt-BR").includes(q))),
    );
  }, [series, busca, soRepetidas, repetidas]);

  const linhaDe = (l: LancamentoNaLista) => linhas[l.id] ?? linhaOriginal(l);
  const topoDe = (s: Serie) => topos[s.chave] ?? topoOriginal(s);

  function alteracoes(s: Serie) {
    const itens: ItemEdicao[] = [];
    let erros = 0;
    for (const l of s.itens) {
      const r = linhas[l.id];
      if (!r) continue;
      const g = paraGravar(l, r);
      if (typeof g === "string") erros += 1;
      else if (mudou(l, g)) itens.push(g);
    }
    return { itens, erros };
  }

  const pendentesGerais = series.map((s) => ({ s, ...alteracoes(s) }));
  const totalMudancas = pendentesGerais.reduce((n, p) => n + p.itens.length, 0);
  const totalErros = pendentesGerais.reduce((n, p) => n + p.erros, 0);
  const seriesMudadas = pendentesGerais.filter((p) => p.itens.length > 0).length;

  function mudarTopo(s: Serie, campo: keyof Topo, valor: string) {
    setTopos((t) => ({ ...t, [s.chave]: { ...topoDe(s), [campo]: valor } }));
    setLinhas((atual) => {
      const prox = { ...atual };
      for (const l of s.itens) {
        const r = prox[l.id] ?? linhaOriginal(l);
        prox[l.id] =
          campo === "base"
            ? { ...r, descricao: trocarBase(l.descricao, valor) }
            : { ...r, [campo]: valor };
      }
      return prox;
    });
  }

  function mudarLinha(l: LancamentoNaLista, campo: keyof Linha, valor: string) {
    setLinhas((a) => ({ ...a, [l.id]: { ...(a[l.id] ?? linhaOriginal(l)), [campo]: valor } }));
  }

  function esquecer(ids: Set<string>) {
    setLinhas((a) => Object.fromEntries(Object.entries(a).filter(([id]) => !ids.has(id))));
    setTopos((t) =>
      Object.fromEntries(
        Object.entries(t).filter(
          ([chave]) =>
            !series.find((s) => s.chave === chave)?.itens.some((l) => ids.has(l.id)),
        ),
      ),
    );
  }

  function descartar(s?: Serie) {
    if (!s) {
      setLinhas({});
      setTopos({});
      return;
    }
    esquecer(new Set(s.itens.map((l) => l.id)));
  }

  function alternar(chave: string) {
    setAbertas((a) => {
      const p = new Set(a);
      if (p.has(chave)) p.delete(chave);
      else p.add(chave);
      return p;
    });
  }

  function gravar(itens: ItemEdicao[]) {
    if (itens.length === 0) return;
    iniciar(async () => {
      const antes: ItemEdicao[] = [];
      let erro: string | null = null;
      // O servidor aceita até 500 por chamada.
      for (let k = 0; k < itens.length; k += 500) {
        const r = await editarLancamentosEmLote(itens.slice(k, k + 500));
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
      // Os campos ainda mostram o que foi desfeito; volta a mostrar o banco.
      esquecer(new Set(antes.map((a) => a.id)));
      setDesfazer(null);
      setRecado(r.ok ? "Desfeito." : r.erro);
      router.refresh();
    });
  }

  function excluir(s: Serie) {
    iniciar(async () => {
      const r = await excluirPendentesEmLote(s.itens.map((l) => l.id));
      setConfirmando(null);
      if (!r.ok) {
        setRecado(r.erro);
        return;
      }
      descartar(s);
      setDesfazer(null);
      setRecado(
        `${r.excluidos} ${r.excluidos === 1 ? "pendência excluída" : "pendências excluídas"} de "${s.base}".` +
          (r.ignorados > 0 ? ` ${r.ignorados} já estavam pagas e ficaram.` : ""),
      );
      router.refresh();
    });
  }

  if (series.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--mut)", padding: "24px 0" }}>
        Nenhuma conta recorrente com pendências.
      </p>
    );
  }

  const quantasRepetidas = Object.keys(repetidas).length;

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
        {series.length} {series.length === 1 ? "série" : "séries"} com contas a pagar ou a
        receber. Mude o nome, o valor ou o dia no topo de um cartão e todos os meses
        pendentes dele acompanham. O que já foi pago não muda.
      </p>

      <div className="flex items-center" style={{ gap: 8 }}>
        <label className="relative flex-1">
          <Search
            size={16}
            strokeWidth={1.5}
            aria-hidden
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--mut)",
            }}
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar série"
            aria-label="Buscar série"
            style={{ ...estiloCampo, paddingLeft: 32 }}
          />
        </label>
        {quantasRepetidas > 0 ? (
          <button
            type="button"
            aria-pressed={soRepetidas}
            onClick={() => setSoRepetidas((v) => !v)}
            style={{
              minHeight: 44,
              padding: "0 12px",
              borderRadius: "var(--rs)",
              border: "1px solid var(--deep)",
              background: soRepetidas ? "var(--deep)" : "transparent",
              color: soRepetidas ? "var(--on-ac)" : "var(--deep)",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Repetidas ({quantasRepetidas})
          </button>
        ) : null}
      </div>

      {recado ? (
        <div
          className="flex items-center justify-between"
          role="status"
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

      {totalMudancas > 0 || totalErros > 0 ? (
        <div
          className="flex flex-col"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            gap: 8,
            padding: 12,
            borderRadius: "var(--rs)",
            border: "1px solid var(--deep)",
            background: "var(--color-bg, var(--tint))",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {totalMudancas} {totalMudancas === 1 ? "alteração" : "alterações"} em {seriesMudadas}{" "}
            {seriesMudadas === 1 ? "série" : "séries"}, ainda não salvas
            {totalErros > 0 ? ` · ${totalErros} com erro` : ""}
          </span>
          <div className="flex" style={{ gap: 8 }}>
            <Botao variante="contorno" onClick={() => descartar()} disabled={gravando}>
              Descartar
            </Botao>
            <Botao
              onClick={() => gravar(pendentesGerais.flatMap((p) => p.itens))}
              disabled={totalMudancas === 0 || totalErros > 0}
              carregando={gravando}
            >
              Salvar tudo
            </Botao>
          </div>
        </div>
      ) : null}

      {visiveis.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--mut)" }}>Nenhuma série com esse filtro.</p>
      ) : null}

      {visiveis.map((s) => {
        const aberta = abertas.has(s.chave);
        const topo = topoDe(s);
        const original = topoOriginal(s);
        const { itens: mudancas, erros } = alteracoes(s);
        const dias = [...new Set(s.itens.map(diaDe))].sort((a, b) => a - b);
        const valores = [...new Set(s.itens.map((l) => l.valor))];
        const total = s.itens.reduce((n, l) => n + l.valor, 0);
        const repetidaDe = repetidas[s.chave];

        return (
          <article
            key={s.chave}
            className="flex flex-col"
            style={{
              gap: 10,
              padding: 12,
              borderRadius: "var(--r)",
              border: `1px solid ${mudancas.length ? "var(--deep)" : "var(--ln2)"}`,
            }}
          >
            <button
              type="button"
              onClick={() => alternar(s.chave)}
              aria-expanded={aberta}
              className="flex w-full items-center text-left"
              style={{ gap: 8, minHeight: 44, background: "transparent", color: "var(--color-text)" }}
            >
              {aberta ? (
                <ChevronDown size={18} strokeWidth={1.5} aria-hidden style={{ flexShrink: 0 }} />
              ) : (
                <ChevronRight size={18} strokeWidth={1.5} aria-hidden style={{ flexShrink: 0 }} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate" style={{ fontSize: 15, fontWeight: 600 }}>
                  {s.base}
                </span>
                <span className="block" style={{ fontSize: 12, color: "var(--mut)" }}>
                  {s.itens.length} {s.itens.length === 1 ? "pendente" : "pendentes"} ·{" "}
                  {mesCurto(dataQueVale(s.itens[0]))}
                  {s.itens.length > 1 ? ` → ${mesCurto(dataQueVale(s.itens[s.itens.length - 1]))}` : ""}
                  {s.onde ? ` · ${s.onde}` : ""}
                  {s.vinculada ? "" : " · agrupada pelo nome"}
                </span>
              </span>
              <span className="text-right" style={{ flexShrink: 0 }}>
                <span className="block" style={{ fontSize: 14, fontWeight: 600 }}>
                  {valores.length === 1 ? (
                    <Dinheiro>{moeda(valores[0])}</Dinheiro>
                  ) : (
                    "valores variados"
                  )}
                </span>
                <span className="block" style={{ fontSize: 12, color: "var(--mut)" }}>
                  {dias.length === 1 ? `dia ${dias[0]}` : `dias ${dias.join(", ")}`}
                </span>
              </span>
            </button>

            {repetidaDe ? (
              <p
                className="flex items-start"
                style={{ gap: 6, fontSize: 12, color: "var(--deep)", lineHeight: 1.5 }}
              >
                <TriangleAlert size={14} strokeWidth={1.5} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Parece a mesma conta que {repetidaDe.map((n) => `"${n}"`).join(", ")}: mesmo
                  valor nos mesmos meses. Se for, exclua uma das duas para não contar a despesa
                  duas vezes.
                </span>
              </p>
            ) : null}

            <div
              className="grid"
              style={{ gridTemplateColumns: "1fr 110px 64px", gap: 8, alignItems: "end" }}
            >
              <label className="flex flex-col" style={{ gap: 4, fontSize: 12, color: "var(--mut)" }}>
                Nome
                <input
                  value={topo.base}
                  onChange={(e) => mudarTopo(s, "base", e.target.value)}
                  style={{ ...estiloCampo, ...(topo.base !== original.base ? destaque : null) }}
                />
              </label>
              <label className="flex flex-col" style={{ gap: 4, fontSize: 12, color: "var(--mut)" }}>
                Valor
                <input
                  inputMode="decimal"
                  value={topo.valor}
                  placeholder={valores.length > 1 ? "vários" : "0,00"}
                  onChange={(e) => mudarTopo(s, "valor", e.target.value)}
                  style={{ ...estiloCampo, ...(topo.valor !== original.valor ? destaque : null) }}
                />
              </label>
              <label className="flex flex-col" style={{ gap: 4, fontSize: 12, color: "var(--mut)" }}>
                Dia
                <input
                  inputMode="numeric"
                  value={topo.dia}
                  placeholder={dias.length > 1 ? "—" : ""}
                  onChange={(e) => mudarTopo(s, "dia", e.target.value.replace(/\D/g, "").slice(0, 2))}
                  style={{ ...estiloCampo, ...(topo.dia !== original.dia ? destaque : null) }}
                />
              </label>
            </div>

            {aberta ? (
              <div className="flex flex-col" style={{ borderTop: "1px solid var(--ln2)" }}>
                {s.itens.map((l) => {
                  const r = linhaDe(l);
                  const o = linhaOriginal(l);
                  const g = linhas[l.id] ? paraGravar(l, r) : null;
                  return (
                    <div
                      key={l.id}
                      className="grid"
                      style={{
                        gridTemplateColumns: "56px 64px 1fr 110px",
                        gap: 8,
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--ln2)",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--mut)" }}>
                        {mesCurto(dataQueVale(l))}
                      </span>
                      <input
                        inputMode="numeric"
                        aria-label={`Dia do vencimento de ${l.descricao}`}
                        value={r.dia}
                        onChange={(e) => mudarLinha(l, "dia", e.target.value.replace(/\D/g, "").slice(0, 2))}
                        style={{ ...estiloCampo, ...(r.dia !== o.dia ? destaque : null) }}
                      />
                      <input
                        aria-label={`Descrição de ${l.descricao}`}
                        value={r.descricao}
                        onChange={(e) => mudarLinha(l, "descricao", e.target.value)}
                        style={{ ...estiloCampo, ...(r.descricao !== o.descricao ? destaque : null) }}
                      />
                      <input
                        inputMode="decimal"
                        aria-label={`Valor de ${l.descricao}`}
                        value={r.valor}
                        onChange={(e) => mudarLinha(l, "valor", e.target.value)}
                        style={{ ...estiloCampo, ...(r.valor !== o.valor ? destaque : null) }}
                      />
                      {typeof g === "string" ? (
                        <span
                          role="alert"
                          style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--bad)" }}
                        >
                          {g}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {mudancas.length > 0 || erros > 0 ? (
              <div className="flex flex-col" style={{ gap: 8 }}>
                {erros > 0 ? (
                  <span style={{ fontSize: 12, color: "var(--bad)" }}>
                    {erros} {erros === 1 ? "linha com erro" : "linhas com erro"}
                    {aberta ? "" : " — abra o cartão para ver"}
                  </span>
                ) : null}
                <div className="flex" style={{ gap: 8 }}>
                  <Botao variante="contorno" onClick={() => descartar(s)} disabled={gravando}>
                    Descartar
                  </Botao>
                  <Botao
                    onClick={() => gravar(mudancas)}
                    disabled={mudancas.length === 0 || erros > 0}
                    carregando={gravando}
                  >
                    Salvar {mudancas.length}
                  </Botao>
                </div>
              </div>
            ) : null}

            {confirmando === s.chave ? (
              <div
                className="flex flex-col"
                style={{ gap: 8, padding: 10, borderRadius: "var(--rs)", background: "var(--ln2)" }}
              >
                <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                  Excluir {s.itens.length}{" "}
                  {s.itens.length === 1 ? "pendência" : "pendências"} de &quot;{s.base}&quot;, somando{" "}
                  <Dinheiro>{moeda(total)}</Dinheiro>? O que já foi pago fica. Não dá para desfazer.
                </span>
                <div className="flex" style={{ gap: 8 }}>
                  <Botao variante="contorno" onClick={() => setConfirmando(null)} disabled={gravando}>
                    Cancelar
                  </Botao>
                  <Botao onClick={() => excluir(s)} carregando={gravando}>
                    Excluir
                  </Botao>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(s.chave)}
                style={{
                  alignSelf: "flex-start",
                  minHeight: 44,
                  padding: 0,
                  background: "transparent",
                  color: "var(--mut)",
                  fontSize: 12,
                  textDecoration: "underline",
                }}
              >
                Excluir as {s.itens.length} pendentes desta série
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
