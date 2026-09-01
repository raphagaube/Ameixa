"use client";

import { CircleCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { moeda } from "@/lib/formato";
import {
  categoriaExistente,
  corParaNova,
  type GrupoPendencia,
} from "@/lib/organizar";
import { organizarPendencias, type Decisao } from "./acoes";

type Cat = { id: string; nome: string; tipo: "despesa" | "receita" };

/** O que fazer com cada grupo: criar categoria, usar uma existente, ou pular. */
type Escolha = { modo: "criar" | "existente" | "pular"; categoriaId: string | null };

export function PainelOrganizar({
  grupos,
  categorias,
  semPista,
}: {
  grupos: GrupoPendencia[];
  categorias: Cat[];
  semPista: number;
}) {
  const router = useRouter();

  // Palpite inicial: se já existe categoria com o mesmo nome, usa; senão cria.
  const inicial = useMemo(() => {
    const m: Record<string, Escolha> = {};
    for (const g of grupos) {
      const jaTem = categoriaExistente(g.nome, g.tipo, categorias);
      m[`${g.tipo}|${g.nome}`] = jaTem
        ? { modo: "existente", categoriaId: jaTem }
        : { modo: "criar", categoriaId: null };
    }
    return m;
  }, [grupos, categorias]);

  const [escolhas, setEscolhas] = useState<Record<string, Escolha>>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const chave = (g: GrupoPendencia) => `${g.tipo}|${g.nome}`;

  const totais = useMemo(() => {
    let lancamentos = 0;
    let novas = 0;
    for (const g of grupos) {
      const e = escolhas[chave(g)];
      if (!e || e.modo === "pular") continue;
      lancamentos += g.ids.length;
      if (e.modo === "criar") novas++;
    }
    return { lancamentos, novas };
  }, [grupos, escolhas]);

  function aplicar() {
    setErro(null);
    const decisoes: Decisao[] = [];

    grupos.forEach((g, i) => {
      const e = escolhas[chave(g)];
      if (!e || e.modo === "pular") return;
      decisoes.push({
        nome: g.nome.slice(0, 40),
        tipo: g.tipo,
        cor: corParaNova(i),
        categoriaId: e.modo === "existente" ? e.categoriaId : null,
        ids: g.ids,
      });
    });

    if (decisoes.length === 0) {
      setErro("Escolha o que fazer com pelo menos um grupo.");
      return;
    }

    iniciar(async () => {
      const r = await organizarPendencias({ decisoes });
      if (r.ok) {
        setPronto(
          `${r.lancamentosAtualizados} lançamentos organizados` +
            (r.categoriasCriadas > 0
              ? `, com ${r.categoriasCriadas} categoria${r.categoriasCriadas > 1 ? "s" : ""} nova${r.categoriasCriadas > 1 ? "s" : ""}.`
              : "."),
        );
        router.refresh();
      } else {
        setErro(r.erro);
      }
    });
  }

  const caixa: React.CSSProperties = {
    borderRadius: "var(--r)",
    border: "1px solid var(--ln2)",
    background: "var(--sf)",
    padding: 14,
  };

  const botao = (ativo: boolean): React.CSSProperties => ({
    minHeight: 34,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: ativo ? 700 : 500,
    background: ativo ? "var(--tint)" : "transparent",
    color: ativo ? "var(--deep)" : "var(--mut)",
    border: `1px solid ${ativo ? "var(--deep)" : "var(--ln)"}`,
  });

  if (pronto) {
    return (
      <div style={caixa} className="flex flex-col">
        <CircleCheck size={32} strokeWidth={1.5} style={{ color: "var(--ok)" }} aria-hidden />
        <h2 style={{ fontSize: 21, marginTop: 10 }}>Organizado</h2>
        <p style={{ fontSize: 14, color: "var(--mut)", marginTop: 6 }}>{pronto}</p>
        <div className="flex flex-col" style={{ gap: 8, marginTop: 16 }}>
          <Botao onClick={() => router.push("/relatorios")}>Ver os relatórios</Botao>
          <Botao variante="contorno" onClick={() => router.push("/pendencias")}>
            Voltar às pendências
          </Botao>
        </div>
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--mut)", padding: "24px 0" }}>
        Não há pendências com categoria de origem para organizar em lote. As que
        sobraram precisam ser completadas uma a uma.
      </p>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 14, paddingBottom: 90 }}>
      <div style={{ ...caixa, background: "var(--tint)" }}>
        <p className="flex items-center" style={{ gap: 8, fontSize: 14, fontWeight: 600 }}>
          <Sparkles size={18} strokeWidth={1.5} style={{ color: "var(--deep)" }} aria-hidden />
          {grupos.length} grupos encontrados
        </p>
        <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 6 }}>
          Agrupei as pendências pela categoria que vinha na sua planilha. As que
          o app ainda não tem, ele cria com o seu nome — não vou tentar encaixar
          “REFEIÇÕES FORA” em “Alimentação”.
        </p>
      </div>

      <ul className="flex flex-col" style={{ gap: 12 }}>
        {grupos.map((g) => {
          const k = chave(g);
          const e = escolhas[k] ?? { modo: "pular", categoriaId: null };
          const doTipo = categorias.filter((c) => c.tipo === g.tipo);

          return (
            <li key={k} style={caixa}>
              <div className="flex items-start justify-between" style={{ gap: 8 }}>
                <div className="min-w-0">
                  <p style={{ fontSize: 15, fontWeight: 600 }}>{g.nome}</p>
                  <p style={{ fontSize: 12, color: "var(--mut)" }}>
                    {g.ids.length} lançamento{g.ids.length > 1 ? "s" : ""} ·{" "}
                    {moeda(g.soma)} · {g.tipo === "receita" ? "receita" : "despesa"}
                  </p>
                </div>
                {e.modo === "criar" ? (
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 4,
                      background: corParaNova(grupos.indexOf(g)),
                    }}
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() =>
                    setEscolhas({ ...escolhas, [k]: { modo: "criar", categoriaId: null } })
                  }
                  aria-pressed={e.modo === "criar"}
                  style={botao(e.modo === "criar")}
                >
                  Criar categoria
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEscolhas({
                      ...escolhas,
                      [k]: {
                        modo: "existente",
                        categoriaId: e.categoriaId ?? doTipo[0]?.id ?? null,
                      },
                    })
                  }
                  aria-pressed={e.modo === "existente"}
                  disabled={doTipo.length === 0}
                  style={botao(e.modo === "existente")}
                >
                  Usar existente
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEscolhas({ ...escolhas, [k]: { modo: "pular", categoriaId: null } })
                  }
                  aria-pressed={e.modo === "pular"}
                  style={botao(e.modo === "pular")}
                >
                  Deixar como está
                </button>
              </div>

              {e.modo === "existente" ? (
                <select
                  value={e.categoriaId ?? ""}
                  onChange={(ev) =>
                    setEscolhas({
                      ...escolhas,
                      [k]: { modo: "existente", categoriaId: ev.target.value },
                    })
                  }
                  aria-label={`Categoria para ${g.nome}`}
                  style={{
                    marginTop: 10,
                    padding: 10,
                    fontSize: 14,
                    width: "100%",
                    borderRadius: "var(--rs)",
                    border: "1px solid var(--ln)",
                    background: "var(--sf)",
                    color: "var(--color-text)",
                  }}
                >
                  {doTipo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              ) : null}
            </li>
          );
        })}
      </ul>

      {semPista > 0 ? (
        <p style={{ fontSize: 12, color: "var(--mut)" }}>
          Outras {semPista} pendências não trazem categoria de origem — essas
          precisam ser completadas uma a uma.
        </p>
      ) : null}

      <div
        className="fixed inset-x-0 z-40 mx-auto"
        style={{
          bottom: "calc(56px + env(safe-area-inset-bottom))",
          maxWidth: "var(--largura)",
          padding: 12,
          background: "var(--sf)",
          borderTop: "1px solid var(--ln)",
        }}
      >
        {erro ? (
          <p role="alert" style={{ fontSize: 12, color: "var(--bad)", marginBottom: 8 }}>
            {erro}
          </p>
        ) : null}
        <Botao onClick={aplicar} carregando={ocupado} disabled={totais.lancamentos === 0}>
          Organizar {totais.lancamentos}
          {totais.novas > 0 ? ` · ${totais.novas} categorias novas` : ""}
        </Botao>
      </div>
    </div>
  );
}
