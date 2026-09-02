"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { BarrasEvolucao } from "@/components/barras-evolucao";
import { RoscaCategorias } from "@/components/rosca-categorias";
import { SeletorMes } from "@/components/seletor-mes";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { Botao } from "@/components/ui/botao";
import { moeda } from "@/lib/formato";
import type { DadosRelatorio } from "@/lib/dados/relatorios";
import { montarFatias } from "@/lib/relatorio";
import { Dinheiro } from "@/components/dinheiro";

export function PainelRelatorios({
  dados,
  ano,
  mes,
}: {
  dados: DadosRelatorio;
  ano: number;
  mes: number;
}) {
  const fatias = montarFatias(dados.despesasPorCategoria);
  const receitas = montarFatias(dados.receitasPorCategoria);

  const pctDaReceita =
    dados.totalReceitas > 0
      ? Math.round((dados.totalDespesas / dados.totalReceitas) * 100)
      : null;

  const maiorReceita = Math.max(...receitas.map((r) => r.valor), 0);

  const cartao: React.CSSProperties = {
    borderRadius: "var(--r)",
    border: "1px solid var(--ln2)",
    background: "var(--sf)",
    padding: "15px 14px",
  };

  return (
    <div className="flex flex-col" style={{ gap: 16, paddingTop: 22 }}>
      <h1 style={{ fontSize: 30 }}>Relatórios</h1>

      <SeletorMes ano={ano} mes={mes} />

      <section style={cartao} className="flex flex-col" aria-labelledby="t-rosca">
        <h2 id="t-rosca" style={{ fontSize: 17, marginBottom: 14 }}>
          Para onde foi o dinheiro
        </h2>
        <RoscaCategorias
          fatias={fatias}
          total={dados.totalDespesas}
          legendaTopo={pctDaReceita !== null ? `${pctDaReceita}% da receita` : undefined}
        />
      </section>

      <section style={cartao} aria-labelledby="t-evol">
        <h2 id="t-evol" style={{ fontSize: 17, marginBottom: 14 }}>
          Receitas × despesas
        </h2>
        <BarrasEvolucao meses={dados.meses} />
      </section>

      <section style={cartao} aria-labelledby="t-origem">
        <h2 id="t-origem" style={{ fontSize: 17, marginBottom: 14 }}>
          De onde veio
        </h2>
        {receitas.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--mut)" }}>
            Nenhuma receita neste período.
          </p>
        ) : (
          <ul className="flex flex-col" style={{ gap: 12 }}>
            {receitas.map((r) => (
              <li key={r.nome}>
                <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{r.nome}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    <Dinheiro>{moeda(r.valor)}</Dinheiro>
                  </span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <BarraProgresso
                    percentual={maiorReceita > 0 ? (r.valor / maiorReceita) * 100 : 0}
                    altura={6}
                    cor={r.cor}
                    rotulo={`Receita de ${r.nome}`}
                  />
                </div>
                <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>
                  {r.percentual}% das receitas
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href={`/relatorios/montar?ano=${ano}&mes=${mes}`}>
        <Botao variante="contorno">
          <span className="flex items-center justify-center" style={{ gap: 8 }}>
            <FileText size={18} strokeWidth={1.5} aria-hidden />
            Montar relatório
          </span>
        </Botao>
      </Link>
    </div>
  );
}
