"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LinhaLancamento } from "@/components/linha-lancamento";
import { SeletorMes } from "@/components/seletor-mes";
import { Botao } from "@/components/ui/botao";
import { Segmentos } from "@/components/ui/segmentos";
import { CampoData } from "@/components/ui/campo-data";
import { dataBr, moeda, nomeMes } from "@/lib/formato";
import type { Ordem } from "@/lib/dados/lancamentos";
import type { Categoria } from "@/lib/tipos/categorias";
import { ROTULO_SITUACAO, type LancamentoNaLista } from "@/lib/tipos/lancamentos";
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

  const subcategorias =
    categorias.find((c) => c.id === categoria)?.subcategorias ?? [];

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
        <p style={{ fontSize: 14, color: "var(--mut)", padding: "24px 0" }}>
          Nenhum lançamento neste período.
        </p>
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
                  <LinhaLancamento key={l.id} l={l} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col">
          {lancamentos.map((l) => (
            <LinhaLancamento key={l.id} l={l} mostrarData />
          ))}
        </div>
      )}
    </div>
  );
}
