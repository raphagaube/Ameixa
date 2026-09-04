"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { SeletorMes } from "@/components/seletor-mes";
import { Botao } from "@/components/ui/botao";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { CampoValor } from "@/components/ui/campo-valor";
import { Folha } from "@/components/ui/folha";
import { moeda } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos/categorias";
import {
  COR_ESTADO,
  FRASE_ESTADO,
  estadoDoOrcamento,
  percentualDoOrcamento,
  type Orcamento,
} from "@/lib/tipos/orcamentos";
import { escreverValor, lerValor } from "@/lib/valor";
import { excluirOrcamento, salvarOrcamento } from "./acoes";
import { Dinheiro } from "@/components/dinheiro";

export function PainelOrcamentos({
  orcamentos,
  categorias,
  ano,
  mes,
  mesIso,
}: {
  orcamentos: Orcamento[];
  categorias: Categoria[];
  ano: number;
  mes: number;
  mesIso: string;
}) {
  const router = useRouter();
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [limite, setLimite] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [emAcao, iniciar] = useTransition();

  function abrir(o?: Orcamento) {
    setCategoriaId(o?.categoria_id ?? categorias[0]?.id ?? "");
    setLimite(escreverValor(o?.limite ?? 0));
    setErro(null);
    setFolhaAberta(true);
  }

  function salvar() {
    setErro(null);
    const n = lerValor(limite);
    if (n === null || n <= 0) {
      setErro("Digite um limite maior que zero.");
      return;
    }
    iniciar(async () => {
      const r = await salvarOrcamento({ categoria_id: categoriaId, limite: n, mes: mesIso });
      if (r.ok) {
        setFolhaAberta(false);
        router.refresh();
      } else {
        setErro(r.erro);
      }
    });
  }

  function excluir(id: string) {
    iniciar(async () => {
      await excluirOrcamento(id);
      router.refresh();
    });
  }

  const legenda = [
    { cor: "var(--ok)", texto: "Tudo certo" },
    { cor: "var(--warn)", texto: "Quase lá" },
    { cor: "var(--bad)", texto: "Ultrapassou" },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <CabecalhoVoltar titulo="Orçamentos" />

      <SeletorMes ano={ano} mes={mes} />

      <ul className="flex flex-wrap" style={{ gap: 12 }}>
        {legenda.map((l) => (
          <li key={l.texto} className="flex items-center" style={{ gap: 6 }}>
            <span
              aria-hidden
              style={{ width: 8, height: 8, borderRadius: 999, background: l.cor }}
            />
            <span style={{ fontSize: 12, color: "var(--mut)" }}>{l.texto}</span>
          </li>
        ))}
      </ul>

      <Botao variante="contorno" onClick={() => abrir()} disabled={categorias.length === 0}>
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <Plus size={18} strokeWidth={1.5} aria-hidden />
          Definir orçamento
        </span>
      </Botao>

      {orcamentos.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--mut)", padding: "24px 0" }}>
          Nenhum orçamento neste mês. Defina um limite para as categorias que
          você quer controlar.
        </p>
      ) : (
        <ul className="flex flex-col" style={{ gap: 12 }}>
          {orcamentos.map((o) => {
            const estado = estadoDoOrcamento(o.gasto, o.limite);
            const pct = percentualDoOrcamento(o.gasto, o.limite);
            return (
              <li
                key={o.id}
                style={{
                  borderRadius: "var(--r)",
                  border: "1px solid var(--ln2)",
                  background: "var(--sf)",
                  padding: "13px 14px",
                }}
              >
                <div className="flex items-start justify-between" style={{ gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => abrir(o)}
                    style={{
                      minHeight: 44,
                      fontSize: 15,
                      fontWeight: 600,
                      background: "transparent",
                      color: "var(--color-text)",
                      textAlign: "left",
                    }}
                  >
                    {o.categoria}
                  </button>
                  <div className="flex items-center" style={{ gap: 4 }}>
                    <span
                      style={{ fontSize: 15, fontWeight: 700, color: COR_ESTADO[estado] }}
                    >
                      {pct}%
                    </span>
                    <button
                      type="button"
                      onClick={() => excluir(o.id)}
                      disabled={emAcao}
                      aria-label={`Remover orçamento de ${o.categoria}`}
                      className="grid place-items-center"
                      style={{
                        width: 44,
                        height: 44,
                        minHeight: 44,
                        background: "transparent",
                        color: "var(--mut)",
                      }}
                    >
                      <Trash2 size={15} strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 4 }}>
                  <Dinheiro>{moeda(o.gasto)}</Dinheiro> de <Dinheiro>{moeda(o.limite)}</Dinheiro>
                </p>

                <div style={{ marginTop: 8 }}>
                  <BarraProgresso
                    percentual={pct}
                    altura={6}
                    cor={COR_ESTADO[estado]}
                    rotulo={`Orçamento de ${o.categoria}`}
                  />
                </div>

                <p style={{ fontSize: 12, color: COR_ESTADO[estado], marginTop: 6 }}>
                  {FRASE_ESTADO[estado]}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/categorias"
        style={{ fontSize: 13, color: "var(--deep)", fontWeight: 600, paddingTop: 4 }}
      >
        Gerenciar categorias
      </Link>

      <Folha
        aberta={folhaAberta}
        aoFechar={() => setFolhaAberta(false)}
        titulo="Orçamento da categoria"
      >
        <div className="flex flex-col" style={{ gap: 16, paddingBottom: 8 }}>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label htmlFor="cat-orc" className="rotulo">
              Categoria
            </label>
            <select
              id="cat-orc"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              style={{
                padding: 12,
                fontSize: 15,
                borderRadius: "var(--rs)",
                border: "1px solid var(--ln)",
                background: "var(--sf)",
                color: "var(--color-text)",
              }}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <CampoValor rotulo="Limite do mês" valor={limite} aoMudar={setLimite} />

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

          <Botao onClick={salvar} carregando={emAcao}>
            Salvar
          </Botao>
        </div>
      </Folha>
    </div>
  );
}
