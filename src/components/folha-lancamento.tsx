"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { salvarLancamento, excluirLancamento } from "@/app/(app)/lancamentos/acoes";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoData } from "@/components/ui/campo-data";
import { CampoValor } from "@/components/ui/campo-valor";
import { Folha } from "@/components/ui/folha";
import { Segmentos } from "@/components/ui/segmentos";
import { paraIso } from "@/lib/formato";
import type { DadosDeApoio } from "@/lib/tipos/apoio";
import {
  ROTULO_FREQUENCIA,
  ROTULO_SITUACAO,
  type Frequencia,
  type LancamentoNaLista,
  type Situacao,
  type TipoLancamento,
  type TipoRepeticao,
  situacaoPadrao,
  situacoesDoTipo,
} from "@/lib/tipos/lancamentos";
import { escreverValor, lerValor } from "@/lib/valor";

export type ValoresIniciais = {
  valor?: number;
  tipo?: "despesa" | "receita";
  contaId?: string | null;
};

const REPETICOES: { valor: TipoRepeticao; texto: string }[] = [
  { valor: "unica", texto: "Única" },
  { valor: "parcelada", texto: "Parcelada" },
  { valor: "recorrente", texto: "Recorrente" },
  { valor: "assinatura", texto: "Assinatura" },
];

export function FolhaLancamento({
  aberta,
  aoFechar,
  dados,
  lancamento,
  iniciais,
}: {
  aberta: boolean;
  aoFechar: (salvou: boolean) => void;
  dados: DadosDeApoio;
  lancamento?: LancamentoNaLista | null;
  iniciais?: ValoresIniciais;
}) {
  const router = useRouter();
  const hoje = paraIso(new Date());
  const editando = !!lancamento;
  const completando = !!lancamento?.incompleto;

  const [tipo, setTipo] = useState<TipoLancamento>(
    lancamento?.tipo ?? iniciais?.tipo ?? "despesa",
  );
  const [valor, setValor] = useState(
    escreverValor(lancamento?.valor ?? iniciais?.valor ?? 0),
  );
  const [descricao, setDescricao] = useState(
    completando ? "" : (lancamento?.descricao ?? ""),
  );
  const [dataRegistro, setDataRegistro] = useState(
    lancamento?.data_registro ?? hoje,
  );
  const [vencimento, setVencimento] = useState(lancamento?.data_vencimento ?? "");
  const [situacao, setSituacao] = useState<Situacao>(
    lancamento?.situacao ?? situacaoPadrao(tipo, dataRegistro, hoje),
  );
  const [categoriaId, setCategoriaId] = useState<string | null>(
    lancamento?.categoria_id ?? null,
  );
  const [subcategoriaId, setSubcategoriaId] = useState<string | null>(
    lancamento?.subcategoria_id ?? null,
  );
  const [contaId, setContaId] = useState<string | null>(
    lancamento?.conta_id ?? iniciais?.contaId ?? null,
  );
  const [cartaoId, setCartaoId] = useState<string | null>(lancamento?.cartao_id ?? null);
  const [forma, setForma] = useState<string>(lancamento?.forma_pagamento ?? "");
  const [novaForma, setNovaForma] = useState("");
  const [formasExtras, setFormasExtras] = useState<string[]>([]);
  const [metaId, setMetaId] = useState<string | null>(lancamento?.meta_id ?? null);
  const [responsavel, setResponsavel] = useState(lancamento?.responsavel ?? "");
  const [observacao, setObservacao] = useState(lancamento?.observacao ?? "");

  const [repeticao, setRepeticao] = useState<TipoRepeticao>("unica");
  const [parcelaAtual, setParcelaAtual] = useState("1");
  const [parcelaTotal, setParcelaTotal] = useState("12");
  const [frequencia, setFrequencia] = useState<Frequencia>("mensal");
  const [ocorrencias, setOcorrencias] = useState("12");
  const [ate, setAte] = useState("");
  const [meses, setMeses] = useState("12");

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const ehAporte = tipo === "aporte";

  const categoriasDoTipo = useMemo(
    () => dados.categorias.filter((c) => c.tipo === (tipo === "receita" ? "receita" : "despesa")),
    [dados.categorias, tipo],
  );

  const subcategorias = useMemo(
    () => dados.categorias.find((c) => c.id === categoriaId)?.subcategorias ?? [],
    [dados.categorias, categoriaId],
  );

  const cartoes = useMemo(() => dados.contas.flatMap((c) => c.cartoes), [dados.contas]);

  const todasFormas = useMemo(
    () => [...dados.formas.map((f) => f.nome), ...formasExtras],
    [dados.formas, formasExtras],
  );

  function trocarTipo(t: TipoLancamento) {
    setTipo(t);
    setSituacao(situacaoPadrao(t, dataRegistro, hoje));
    // Categoria de despesa não serve para receita e vice-versa.
    setCategoriaId(null);
    setSubcategoriaId(null);
    if (t === "aporte") {
      setCartaoId(null);
      setForma("");
      setRepeticao("unica");
    }
  }

  function trocarData(iso: string) {
    setDataRegistro(iso);
    // Data futura vira a pagar / a receber sozinha, como manda a regra 3.
    setSituacao(situacaoPadrao(tipo, iso, hoje));
  }

  function adicionarForma() {
    const n = novaForma.trim();
    if (!n) return;
    if (!todasFormas.some((f) => f.toLowerCase() === n.toLowerCase())) {
      setFormasExtras((x) => [...x, n]);
    }
    setForma(n);
    setNovaForma("");
  }

  function salvar() {
    setErro(null);
    const n = lerValor(valor);
    if (n === null || n <= 0) {
      setErro("Digite um valor maior que zero.");
      return;
    }
    if (!descricao.trim()) {
      setErro("Escreva uma descrição.");
      return;
    }
    if (ehAporte && !metaId) {
      setErro("Escolha em qual meta você quer guardar.");
      return;
    }

    const config =
      repeticao === "parcelada"
        ? {
            repeticao: "parcelada" as const,
            parcelaAtual: Number(parcelaAtual) || 1,
            parcelaTotal: Number(parcelaTotal) || 1,
          }
        : repeticao === "recorrente"
          ? {
              repeticao: "recorrente" as const,
              frequencia,
              ocorrencias: Number(ocorrencias) || 1,
              ate: frequencia === "personalizado" ? ate || null : null,
            }
          : repeticao === "assinatura"
            ? { repeticao: "assinatura" as const, meses: Number(meses) || 1 }
            : { repeticao: "unica" as const };

    iniciar(async () => {
      const r = await salvarLancamento({
        id: lancamento?.id,
        tipo,
        valor: n,
        descricao: descricao.trim(),
        data_registro: dataRegistro,
        data_vencimento: vencimento || null,
        situacao,
        categoria_id: categoriaId,
        subcategoria_id: subcategoriaId,
        conta_id: contaId,
        cartao_id: forma.toLowerCase() === "crédito" ? cartaoId : null,
        forma_pagamento: forma || null,
        responsavel: responsavel.trim() || null,
        observacao: observacao.trim() || null,
        meta_id: metaId,
        incompleto: false,
        repeticao: config,
      });

      if (r.ok) {
        aoFechar(true);
        router.refresh();
      } else {
        setErro(r.erro);
      }
    });
  }

  function excluir() {
    if (!lancamento) return;
    setErro(null);
    iniciar(async () => {
      const r = await excluirLancamento(lancamento.id, false);
      if (r.ok) {
        aoFechar(true);
        router.refresh();
      } else {
        setErro(r.erro);
      }
    });
  }

  const titulo = completando
    ? "Completar lançamento"
    : editando
      ? "Editar lançamento"
      : "Novo lançamento";

  const chip = (ativo: boolean, cor?: string, corTexto?: string): React.CSSProperties => ({
    minHeight: 36,
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: ativo ? 700 : 500,
    background: ativo ? (cor ?? "var(--tint)") : "transparent",
    color: ativo ? (corTexto ?? "var(--deep)") : "var(--color-text)",
    border: `1px solid ${ativo ? (cor ?? "var(--deep)") : "var(--ln)"}`,
  });

  return (
    <Folha aberta={aberta} aoFechar={() => aoFechar(false)} titulo={titulo} alturaMaxima="92vh">
      <div className="flex flex-col" style={{ gap: 16, paddingBottom: 8 }}>
        <Segmentos
          rotulo="Tipo"
          opcoes={[
            { valor: "despesa" as const, texto: "Despesa" },
            { valor: "receita" as const, texto: "Receita" },
            { valor: "aporte" as const, texto: "Guardar em meta" },
          ]}
          valor={tipo}
          aoEscolher={trocarTipo}
          colunas="1fr 1fr 1.3fr"
        />

        <CampoValor rotulo="Valor" valor={valor} aoMudar={setValor} />

        {!ehAporte ? (
          <Segmentos
            rotulo="Situação"
            opcoes={situacoesDoTipo(tipo).map((s) => ({
              valor: s,
              texto: ROTULO_SITUACAO[s],
            }))}
            valor={situacao}
            aoEscolher={setSituacao}
          />
        ) : null}

        <Campo
          rotulo="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={120}
          placeholder={ehAporte ? "Ex.: Reserva de emergência" : "Ex.: Mercado"}
        />

        <CampoData rotulo="Data do registro" valor={dataRegistro} aoMudar={trocarData} />

        {!ehAporte ? (
          <CampoData rotulo="Vencimento" valor={vencimento} aoMudar={setVencimento} opcional />
        ) : null}

        {ehAporte ? (
          <div className="flex flex-col" style={{ gap: 6 }}>
            <span className="rotulo">Guardar em qual meta</span>
            {dados.metas.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--mut)" }}>
                Você ainda não tem metas. Crie uma na aba Metas.
              </p>
            ) : (
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {dados.metas.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetaId(m.id)}
                    aria-pressed={metaId === m.id}
                    style={chip(metaId === m.id)}
                  >
                    {m.nome}
                  </button>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--mut)" }}>
              O valor sai da conta e entra na meta. Não conta como despesa.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <span className="rotulo">Categoria</span>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {categoriasDoTipo.map((c) => {
                  const ativo = categoriaId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoriaId(ativo ? null : c.id);
                        setSubcategoriaId(null);
                      }}
                      aria-pressed={ativo}
                      style={chip(ativo, c.cor, c.cor_texto)}
                    >
                      {c.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            {subcategorias.length > 0 ? (
              <div className="flex flex-col" style={{ gap: 6 }}>
                <span className="rotulo">Subcategoria</span>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {subcategorias.map((s) => {
                    const ativo = subcategoriaId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSubcategoriaId(ativo ? null : s.id)}
                        aria-pressed={ativo}
                        style={chip(ativo)}
                      >
                        {s.nome}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="rotulo">Conta / banco</span>
          {dados.contas.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--mut)" }}>
              Cadastre um banco em Ajustes → Cartões e contas.
            </p>
          ) : (
            <div className="grid grid-cols-2" style={{ gap: 8 }}>
              {dados.contas.map((c) => {
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

        {!ehAporte ? (
          <>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <span className="rotulo">Meio de pagamento</span>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {todasFormas.map((f) => {
                  const ativo = forma === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setForma(ativo ? "" : f);
                        if (f.toLowerCase() !== "crédito") setCartaoId(null);
                      }}
                      aria-pressed={ativo}
                      style={chip(ativo)}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              <div className="flex" style={{ gap: 8, marginTop: 2 }}>
                <input
                  value={novaForma}
                  onChange={(e) => setNovaForma(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarForma();
                    }
                  }}
                  placeholder="Nova forma de pagamento"
                  aria-label="Nova forma de pagamento"
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    borderRadius: "var(--rs)",
                    border: "1px solid var(--ln)",
                    background: "var(--sf)",
                    color: "var(--color-text)",
                  }}
                />
                <Botao
                  variante="contorno"
                  type="button"
                  onClick={adicionarForma}
                  style={{ width: "auto", paddingInline: 18 }}
                >
                  Adicionar
                </Botao>
              </div>
            </div>

            {forma.toLowerCase() === "crédito" && cartoes.length > 0 ? (
              <div className="flex flex-col" style={{ gap: 6 }}>
                <span className="rotulo">Qual cartão</span>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {cartoes.map((k) => {
                    const ativo = cartaoId === k.id;
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setCartaoId(ativo ? null : k.id)}
                        aria-pressed={ativo}
                        style={chip(ativo, ativo ? k.cor : undefined, "#ffffff")}
                      >
                        {k.nome}
                        {k.final ? ` · ${k.final}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {!editando ? (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <Segmentos
                  rotulo="Repetição"
                  opcoes={REPETICOES}
                  valor={repeticao}
                  aoEscolher={setRepeticao}
                  colunas="1fr 1fr"
                />

                {repeticao === "parcelada" ? (
                  <div className="grid grid-cols-2" style={{ gap: 12 }}>
                    <Campo
                      rotulo="Parcela atual"
                      type="number"
                      min={1}
                      value={parcelaAtual}
                      onChange={(e) => setParcelaAtual(e.target.value)}
                    />
                    <Campo
                      rotulo="Total de parcelas"
                      type="number"
                      min={1}
                      value={parcelaTotal}
                      onChange={(e) => setParcelaTotal(e.target.value)}
                    />
                  </div>
                ) : null}

                {repeticao === "recorrente" ? (
                  <>
                    <Segmentos
                      rotulo="Frequência"
                      opcoes={(
                        [
                          "semanal",
                          "quinzenal",
                          "mensal",
                          "semestral",
                          "anual",
                          "personalizado",
                        ] as Frequencia[]
                      ).map((f) => ({ valor: f, texto: ROTULO_FREQUENCIA[f] }))}
                      valor={frequencia}
                      aoEscolher={setFrequencia}
                      colunas="1fr 1fr"
                    />
                    {frequencia === "personalizado" ? (
                      <CampoData rotulo="Repetir até" valor={ate} aoMudar={setAte} opcional />
                    ) : (
                      <Campo
                        rotulo="Quantas repetições gerar"
                        type="number"
                        min={1}
                        max={240}
                        value={ocorrencias}
                        onChange={(e) => setOcorrencias(e.target.value)}
                      />
                    )}
                  </>
                ) : null}

                {repeticao === "assinatura" ? (
                  <Campo
                    rotulo="Por quantos meses"
                    type="number"
                    min={1}
                    max={240}
                    value={meses}
                    onChange={(e) => setMeses(e.target.value)}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        <div
          style={{
            border: "1px solid var(--ln)",
            borderRadius: "var(--r)",
            padding: 14,
          }}
        >
          <Campo
            rotulo="Responsável"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            maxLength={60}
            placeholder="Quem fez esse lançamento"
          />
        </div>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <label htmlFor="obs-lanc" className="rotulo">
            Observação
          </label>
          <textarea
            id="obs-lanc"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            maxLength={2000}
            style={{
              padding: 12,
              fontSize: 15,
              borderRadius: "var(--rs)",
              border: "1px solid var(--ln)",
              background: "var(--sf)",
              color: "var(--color-text)",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

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
          Salvar lançamento
        </Botao>

        {editando ? (
          <Botao
            variante="contorno"
            onClick={excluir}
            carregando={salvando}
            style={{ color: "var(--bad)", borderColor: "var(--bad)" }}
          >
            Excluir lançamento
          </Botao>
        ) : null}
      </div>
    </Folha>
  );
}
