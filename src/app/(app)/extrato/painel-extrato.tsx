"use client";

import { CheckSquare, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  marcarSituacaoEmLote,
  mudarDiaDoVencimentoEmLote,
  restaurarSituacoes,
  restaurarVencimentos,
} from "@/app/(app)/lancamentos/acoes";
import { LinhaLancamento } from "@/components/linha-lancamento";
import { SeletorMes } from "@/components/seletor-mes";
import { Botao } from "@/components/ui/botao";
import { Segmentos } from "@/components/ui/segmentos";
import { CampoData } from "@/components/ui/campo-data";
import { dataBr, moeda, nomeMes } from "@/lib/formato";
import type { Ordem } from "@/lib/dados/lancamentos";
import type { Categoria } from "@/lib/tipos/categorias";
import {
  dataQueVale,
  ROTULO_SITUACAO,
  type LancamentoNaLista,
  type Situacao,
} from "@/lib/tipos/lancamentos";
import type { Periodo } from "./page";
import { Dinheiro } from "@/components/dinheiro";

const ORDENS: { valor: Ordem; texto: string }[] = [
  { valor: "recentes", texto: "Mais novos primeiro" },
  { valor: "antigos", texto: "Mais antigos primeiro" },
  { valor: "maior", texto: "Maior valor" },
  { valor: "menor", texto: "Menor valor" },
];

export function PainelExtrato({
  lancamentos,
  categorias,
  periodo,
  ano,
  mes,
  dia,
  ordem,
  de,
  ate,
}: {
  lancamentos: LancamentoNaLista[];
  categorias: Categoria[];
  periodo: Periodo;
  ano: number;
  mes: number;
  dia: number;
  ordem: Ordem;
  de: string;
  ate: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [busca, setBusca] = useState(params.get("texto") ?? "");
  const [categoria, setCategoria] = useState(params.get("categoria") ?? "");
  const [subcategoria, setSubcategoria] = useState(params.get("subcategoria") ?? "");
  const [situacao, setSituacao] = useState(params.get("situacao") ?? "");
  const [responsavel, setResponsavel] = useState(params.get("responsavel") ?? "");
  const [faixaDe, setFaixaDe] = useState(params.get("de") ?? de);
  const [faixaAte, setFaixaAte] = useState(params.get("ate") ?? ate);

  // Seleção em lote.
  const [selecionando, setSelecionando] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [corte, setCorte] = useState(ate);
  const [aplicando, iniciarAplicacao] = useTransition();
  const [recado, setRecado] = useState<string | null>(null);
  const [diaVencimento, setDiaVencimento] = useState("");
  const [desfazer, setDesfazer] = useState<
    | { tipo: "situacao"; antes: { id: string; situacao: Situacao }[] }
    | { tipo: "vencimento"; antes: { id: string; data_vencimento: string | null }[] }
    | null
  >(null);
  const diaEscolhido = Number(diaVencimento);
  const diaValido =
    Number.isInteger(diaEscolhido) && diaEscolhido >= 1 && diaEscolhido <= 31;

  const pendentes = useMemo(
    () =>
      lancamentos.filter(
        (l) => l.situacao === "a_pagar" || l.situacao === "a_receber",
      ),
    [lancamentos],
  );

  const selecionados = useMemo(
    () => lancamentos.filter((l) => marcados.has(l.id)),
    [lancamentos, marcados],
  );

  const somaSelecionada = selecionados.reduce((s, l) => {
    if (l.tipo === "aporte") return s;
    return l.tipo === "receita" ? s + l.valor : s - l.valor;
  }, 0);

  const aportesNaSelecao = selecionados.filter((l) => l.tipo === "aporte").length;

  function alternar(id: string) {
    setMarcados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function sairDaSelecao() {
    setSelecionando(false);
    setMarcados(new Set());
  }

  /**
   * Marca as pendências que já venceram até a data escolhida.
   *
   * A lista é filtrada por data de registro, mas o que decide se uma
   * parcela já passou é o vencimento — as vinte e uma parcelas de um
   * processo são registradas no mesmo dia e vencem ao longo de dois anos.
   * Por isso o corte olha `dataQueVale`, e não a data da lista.
   */
  function selecionarVencidos() {
    setMarcados(
      new Set(
        pendentes.filter((l) => dataQueVale(l) <= corte).map((l) => l.id),
      ),
    );
  }

  function aplicar(alvo: "quitado" | "pendente") {
    const ids = [...marcados];
    if (ids.length === 0) return;
    iniciarAplicacao(async () => {
      const r = await marcarSituacaoEmLote(ids, alvo);
      if (!r.ok) {
        setRecado(r.erro);
        return;
      }
      setDesfazer(r.antes.length > 0 ? { tipo: "situacao", antes: r.antes } : null);
      setRecado(
        r.alterados === 0
          ? "Nada mudou: nenhum dos escolhidos precisava dessa mudança."
          : `${r.alterados} ${r.alterados === 1 ? "lançamento alterado" : "lançamentos alterados"}` +
              (r.ignorados > 0 ? ` · ${r.ignorados} de fora` : ""),
      );
      sairDaSelecao();
      router.refresh();
    });
  }

  function aplicarDia() {
    const ids = [...marcados];
    if (ids.length === 0 || !diaValido) return;
    iniciarAplicacao(async () => {
      const r = await mudarDiaDoVencimentoEmLote(ids, diaEscolhido);
      if (!r.ok) {
        setRecado(r.erro);
        return;
      }
      setDesfazer(r.antes.length > 0 ? { tipo: "vencimento", antes: r.antes } : null);
      setRecado(
        r.alterados === 0
          ? `Nada mudou: todos já vencem no dia ${diaEscolhido}.`
          : `${r.alterados} ${r.alterados === 1 ? "vencimento mudou" : "vencimentos mudaram"} para o dia ${diaEscolhido}` +
              (r.ignorados > 0 ? ` · ${r.ignorados} já estavam certos` : ""),
      );
      sairDaSelecao();
      router.refresh();
    });
  }

  function aplicarDesfazer() {
    const d = desfazer;
    if (!d) return;
    iniciarAplicacao(async () => {
      const r =
        d.tipo === "situacao"
          ? await restaurarSituacoes(d.antes)
          : await restaurarVencimentos(d.antes);
      setRecado(r.ok ? "Desfeito." : r.erro);
      setDesfazer(null);
      router.refresh();
    });
  }

  const subcategorias =
    categorias.find((c) => c.id === categoria)?.subcategorias ?? [];

  // O que está filtrando agora, para a lista vazia poder apontar a causa.
  const filtrosAtivos = [
    busca ? `busca "${busca}"` : null,
    categoria
      ? `categoria ${categorias.find((c) => c.id === categoria)?.nome ?? ""}`
      : null,
    subcategoria ? "subcategoria" : null,
    situacao ? `situação ${situacao.replace("_", " ")}` : null,
    responsavel ? `responsável "${responsavel}"` : null,
  ].filter(Boolean) as string[];
  const temFiltro = filtrosAtivos.length > 0;
  const resumoDosFiltros = filtrosAtivos.join(", ");

  function irPara(mudancas: Record<string, string | undefined>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === undefined || v === "") q.delete(k);
      else q.set(k, v);
    }
    router.push(`/extrato?${q.toString()}`, { scroll: false });
  }

  function aplicarBusca() {
    irPara({
      texto: busca,
      categoria,
      subcategoria,
      situacao,
      responsavel,
    });
  }

  function limparBusca() {
    setBusca("");
    setCategoria("");
    setSubcategoria("");
    setSituacao("");
    setResponsavel("");
    irPara({
      texto: undefined,
      categoria: undefined,
      subcategoria: undefined,
      situacao: undefined,
      responsavel: undefined,
    });
  }

  const total = useMemo(
    () =>
      lancamentos.reduce((s, l) => {
        if (l.tipo === "aporte") return s; // aporte não entra no saldo
        return l.tipo === "receita" ? s + l.valor : s - l.valor;
      }, 0),
    [lancamentos],
  );

  // Nas ordens por data a lista é agrupada por dia; nas ordens por valor,
  // vira lista corrida com a data em cada item.
  const porData = ordem === "recentes" || ordem === "antigos";

  const grupos = useMemo(() => {
    if (!porData) return [];
    const mapa = new Map<string, LancamentoNaLista[]>();
    for (const l of lancamentos) {
      const chave = l.data_registro;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(l);
    }
    return [...mapa.entries()];
  }, [lancamentos, porData]);

  const estiloSelect: React.CSSProperties = {
    padding: 12,
    fontSize: 15,
    borderRadius: "var(--rs)",
    border: "1px solid var(--ln)",
    background: "var(--sf)",
    color: "var(--color-text)",
    width: "100%",
  };

  return (
    <div className="flex flex-col" style={{ gap: 14, paddingTop: 22 }}>
      <h1 style={{ fontSize: 30 }}>Extrato</h1>

      {/* Filtros e lista: empilhados no celular, lado a lado no notebook. */}
      <div className="extrato-grade">
        <div className="extrato-filtros">
          <Segmentos
            opcoes={[
              { valor: "dia" as const, texto: "Dia" },
              { valor: "mes" as const, texto: "Mês" },
              { valor: "ano" as const, texto: "Ano" },
              { valor: "faixa" as const, texto: "Faixa" },
            ]}
            valor={periodo}
            aoEscolher={(v) => irPara({ periodo: v })}
          />

          {periodo === "mes" ? <SeletorMes ano={ano} mes={mes} /> : null}

          {periodo === "dia" ? (
            <CampoData
              rotulo="Dia"
              valor={`${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`}
              aoMudar={(iso) => {
                const [a, m, d] = iso.split("-");
                irPara({ ano: a, mes: String(Number(m) - 1), dia: d });
              }}
            />
          ) : null}

          {periodo === "ano" ? (
            <div
              className="grid items-center"
              style={{ gridTemplateColumns: "44px 1fr 44px", gap: 8 }}
            >
              <button
                type="button"
                onClick={() => irPara({ ano: String(ano - 1) })}
                aria-label="Ano anterior"
                style={{ ...estiloSelect, height: 44 }}
              >
                ‹
              </button>
              <div style={{ ...estiloSelect, textAlign: "center", fontWeight: 600 }}>
                {ano}
              </div>
              <button
                type="button"
                onClick={() => irPara({ ano: String(ano + 1) })}
                aria-label="Próximo ano"
                style={{ ...estiloSelect, height: 44 }}
              >
                ›
              </button>
            </div>
          ) : null}

          {periodo === "faixa" ? (
            <div className="flex flex-col" style={{ gap: 10 }}>
              <CampoData rotulo="De" valor={faixaDe} aoMudar={setFaixaDe} />
              <CampoData rotulo="Até" valor={faixaAte} aoMudar={setFaixaAte} />
              <div className="flex" style={{ gap: 8 }}>
                <Botao onClick={() => irPara({ de: faixaDe, ate: faixaAte })}>
                  Aplicar filtro
                </Botao>
                <Botao
                  variante="contorno"
                  onClick={() => irPara({ periodo: "mes", de: undefined, ate: undefined })}
                >
                  Remover
                </Botao>
              </div>
            </div>
          ) : null}

          <section
            className="flex flex-col"
            style={{
              gap: 10,
              border: "1px solid var(--ln)",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div className="flex" style={{ gap: 8 }}>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") aplicarBusca();
                }}
                placeholder="Buscar por descrição ou valor"
                aria-label="Buscar por descrição ou valor"
                style={{ ...estiloSelect, flex: 1 }}
              />
              <Botao
                onClick={aplicarBusca}
                style={{ width: "auto", paddingInline: 16 }}
                aria-label="Buscar"
              >
                <Search size={18} strokeWidth={2} aria-hidden />
              </Botao>
            </div>

            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setSubcategoria("");
              }}
              aria-label="Categoria"
              style={estiloSelect}
            >
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            {subcategorias.length > 0 ? (
              <select
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                aria-label="Subcategoria"
                style={estiloSelect}
              >
                <option value="">Todas as subcategorias</option>
                {subcategorias.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
              aria-label="Situação"
              style={estiloSelect}
            >
              <option value="">Qualquer situação</option>
              {(["pago", "a_pagar", "recebido", "a_receber", "guardado"] as const).map(
                (s) => (
                  <option key={s} value={s}>
                    {ROTULO_SITUACAO[s]}
                  </option>
                ),
              )}
            </select>

            <input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Responsável"
              aria-label="Responsável"
              style={estiloSelect}
            />

            <div className="flex" style={{ gap: 8 }}>
              <Botao
                variante="contorno"
                onClick={() => router.push(`/extrato/repetidos?de=${de}&ate=${ate}`)}
              >
                Buscar repetidos
              </Botao>
              <Botao variante="contorno" onClick={limparBusca}>
                <span className="flex items-center justify-center" style={{ gap: 6 }}>
                  <X size={16} strokeWidth={2} aria-hidden />
                  Limpar
                </span>
              </Botao>
            </div>
          </section>
        </div>

        <div className="extrato-lista">
          <select
            value={ordem}
            onChange={(e) => irPara({ ordem: e.target.value })}
            aria-label="Ordenação"
            style={estiloSelect}
          >
            {ORDENS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>

          {recado ? (
            <div
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
              <span className="flex items-center" style={{ gap: 8, flexShrink: 0 }}>
                {desfazer ? (
                  <button
                    type="button"
                    onClick={aplicarDesfazer}
                    disabled={aplicando}
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
                  style={{
                    minHeight: 44,
                    width: 44,
                    background: "transparent",
                    color: "var(--mut)",
                  }}
                >
                  <X size={16} strokeWidth={1.5} aria-hidden />
                </button>
              </span>
            </div>
          ) : null}

          {lancamentos.length === 0 ? null : !selecionando ? (
            <div className="flex" style={{ gap: 8 }}>
              <Botao variante="contorno" onClick={() => setSelecionando(true)}>
                <span className="flex items-center justify-center" style={{ gap: 6 }}>
                  <CheckSquare size={16} strokeWidth={1.5} aria-hidden />
                  Selecionar vários
                </span>
              </Botao>
              <Botao variante="contorno" onClick={() => router.push("/recorrentes")}>
                Contas recorrentes
              </Botao>
            </div>
          ) : (
            <section
              className="flex flex-col"
              style={{
                gap: 10,
                padding: 12,
                borderRadius: "var(--rs)",
                border: "1px solid var(--ln2)",
              }}
            >
              <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {marcados.size}{" "}
                  {marcados.size === 1 ? "escolhido" : "escolhidos"}
                </span>
                {marcados.size > 0 ? (
                  <span
                    style={{
                      fontSize: 13,
                      color: somaSelecionada < 0 ? "var(--bad)" : "var(--ok)",
                    }}
                  >
                    {somaSelecionada < 0 ? "−" : "+"}
                    <Dinheiro>{moeda(Math.abs(somaSelecionada))}</Dinheiro>
                  </span>
                ) : null}
              </div>

              <div className="flex" style={{ gap: 8 }}>
                <Botao
                  variante="contorno"
                  onClick={() => setMarcados(new Set(lancamentos.map((l) => l.id)))}
                >
                  Todos
                </Botao>
                <Botao variante="contorno" onClick={() => setMarcados(new Set())}>
                  Nenhum
                </Botao>
              </div>

              {pendentes.length > 0 ? (
                <>
                  <CampoData rotulo="Vencidos até" valor={corte} aoMudar={setCorte} />
                  <Botao variante="contorno" onClick={selecionarVencidos}>
                    Escolher pendências vencidas
                  </Botao>
                  <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>
                    Usa o vencimento de cada lançamento — e a data do registro só
                    quando não há vencimento. Parcela que vence depois dessa data
                    fica de fora, mesmo tendo sido registrada antes.
                  </p>
                </>
              ) : null}

              <label
                className="flex flex-col"
                style={{ gap: 4, fontSize: 12, color: "var(--mut)" }}
              >
                Dia do vencimento
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  placeholder="Ex.: 10"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  style={{
                    minHeight: 44,
                    padding: "0 12px",
                    borderRadius: "var(--rs)",
                    border: "1px solid var(--ln2)",
                    fontSize: 16,
                    color: "var(--color-text)",
                    background: "transparent",
                  }}
                />
              </label>
              <Botao
                variante="contorno"
                onClick={aplicarDia}
                disabled={marcados.size === 0 || !diaValido}
                carregando={aplicando}
              >
                Mudar o dia do vencimento
              </Botao>
              <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>
                Cada lançamento fica no mês em que já está; só o dia muda. Dia 31
                em mês de 30 dias vira dia 30. Quem não tinha vencimento passa a
                ter, no mês da data de registro.
              </p>

              {aportesNaSelecao > 0 ? (
                <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>
                  {aportesNaSelecao}{" "}
                  {aportesNaSelecao === 1 ? "aporte em meta" : "aportes em meta"} na
                  escolha —{" "}
                  {aportesNaSelecao === 1 ? "ele fica" : "eles ficam"} de fora, porque
                  aporte não é despesa nem receita.
                </p>
              ) : null}

              <Botao
                onClick={() => aplicar("quitado")}
                disabled={marcados.size === 0}
                carregando={aplicando}
              >
                Marcar como pago e recebido
              </Botao>
              <Botao
                variante="contorno"
                onClick={() => aplicar("pendente")}
                disabled={marcados.size === 0}
                carregando={aplicando}
              >
                Voltar para pendente
              </Botao>
              <Botao variante="texto" onClick={sairDaSelecao}>
                Cancelar
              </Botao>
            </section>
          )}

          <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--mut)" }}>
              {periodo === "mes"
                ? `${nomeMes(mes)} ${ano}`
                : periodo === "ano"
                  ? String(ano)
                  : `${dataBr(de)} — ${dataBr(ate)}`}
            </span>
            <span style={{ fontSize: 12, color: "var(--mut)" }}>
              {lancamentos.length}{" "}
              {lancamentos.length === 1 ? "lançamento" : "lançamentos"} ·{" "}
              <span style={{ color: total < 0 ? "var(--bad)" : "var(--ok)" }}>
                {total < 0 ? "−" : "+"}
                <Dinheiro>{moeda(Math.abs(total))}</Dinheiro>
              </span>
            </span>
          </div>

          {lancamentos.length === 0 ? (
            /* A mensagem antiga culpava o período. Como os filtros sobrevivem na
               URL, o dono voltava dias depois com "uber" ainda no campo de busca,
               via o mês vazio e concluía que não tinha lançado nada. */
            <div className="flex flex-col" style={{ gap: 10, padding: "24px 0" }}>
              <p style={{ fontSize: 14, color: "var(--mut)" }}>
                {temFiltro
                  ? "Nenhum lançamento com esses filtros."
                  : "Nenhum lançamento neste período."}
              </p>
              {temFiltro ? (
                <>
                  <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
                    Filtros ligados: {resumoDosFiltros}.
                  </p>
                  <Botao variante="contorno" onClick={limparBusca}>
                    Limpar os filtros
                  </Botao>
                </>
              ) : null}
            </div>
          ) : porData ? (
            <div className="flex flex-col" style={{ gap: 16 }}>
              {grupos.map(([data, itens]) => {
                const totalDia = itens.reduce((s, l) => {
                  if (l.tipo === "aporte") return s;
                  return l.tipo === "receita" ? s + l.valor : s - l.valor;
                }, 0);
                return (
                  <div key={data}>
                    <div
                      className="flex items-baseline justify-between"
                      style={{
                        gap: 8,
                        paddingBottom: 6,
                        borderBottom: "1px solid var(--ln2)",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mut)" }}>
                        {dataBr(data)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: totalDia < 0 ? "var(--bad)" : "var(--ok)",
                        }}
                      >
                        {totalDia < 0 ? "−" : "+"}
                        <Dinheiro>{moeda(Math.abs(totalDia))}</Dinheiro>
                      </span>
                    </div>
                    {itens.map((l) => (
                      <LinhaLancamento
                        key={l.id}
                        l={l}
                        selecionavel={selecionando}
                        selecionado={marcados.has(l.id)}
                        aoAlternar={alternar}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col">
              {lancamentos.map((l) => (
                <LinhaLancamento
                  key={l.id}
                  l={l}
                  mostrarData
                  selecionavel={selecionando}
                  selecionado={marcados.has(l.id)}
                  aoAlternar={alternar}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
