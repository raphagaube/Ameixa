"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { BarrasEvolucao } from "@/components/barras-evolucao";
import { LogoAmeixa } from "@/components/logo-ameixa";
import { RoscaCategorias } from "@/components/rosca-categorias";
import { Botao } from "@/components/ui/botao";
import type { DadosRelatorio } from "@/lib/dados/relatorios";
import { dataBr, moedaOuOculto } from "@/lib/formato";
import { calcularIndicadores, montarFatias } from "@/lib/relatorio";
import { baixarExcel } from "@/lib/exportar";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";
import type { Meta } from "@/lib/tipos/metas";
import { percentualDaMeta } from "@/lib/tipos/metas";
import {
  COR_ESTADO,
  estadoDoOrcamento,
  percentualDoOrcamento,
  type Orcamento,
} from "@/lib/tipos/orcamentos";
import { ROTULO_SITUACAO } from "@/lib/tipos/lancamentos";

export function DocumentoRelatorio({
  dados,
  nome,
  de,
  ate,
  secoes,
  ocultar,
  tecnicos,
  lancamentos,
  orcamentos,
  metas,
}: {
  dados: DadosRelatorio;
  nome: string;
  de: string;
  ate: string;
  secoes: string[];
  ocultar: boolean;
  tecnicos: boolean;
  lancamentos: LancamentoNaLista[];
  orcamentos: Orcamento[];
  metas: Meta[];
}) {
  const router = useRouter();
  const fatias = montarFatias(dados.despesasPorCategoria);
  const receitas = montarFatias(dados.receitasPorCategoria);
  const saldo = dados.totalReceitas - dados.totalDespesas;

  const ind = calcularIndicadores(
    dados.despesasCruas,
    dados.diasNoPeriodo,
    dados.totalAnterior,
  );

  const v = (n: number) => moedaOuOculto(n, ocultar);

  // Numeração das seções acompanha o que foi ativado, sem buracos.
  let n = 0;
  const numero = () => ++n;

  const titulo = (texto: string) => (
    <h2 style={{ fontSize: 17, marginBottom: 12 }}>
      <span style={{ color: "var(--mut)", marginRight: 6 }}>{numero()}.</span>
      {texto}
    </h2>
  );

  const bloco: React.CSSProperties = {
    borderRadius: "var(--r)",
    border: "1px solid var(--ln2)",
    background: "var(--sf)",
    padding: "15px 14px",
  };

  function exportarExcel() {
    baixarExcel(
      lancamentos.length > 0 ? lancamentos : [],
      dados,
      { de, ate, nome },
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 16, paddingTop: 22 }}>
      <div className="flex nao-imprimir" style={{ gap: 8 }}>
        <Botao variante="contorno" onClick={() => router.back()}>
          Voltar
        </Botao>
        <Botao variante="contorno" onClick={exportarExcel}>
          <span className="flex items-center justify-center" style={{ gap: 6 }}>
            <FileSpreadsheet size={16} strokeWidth={1.5} aria-hidden />
            Excel
          </span>
        </Botao>
        <Botao onClick={() => window.print()}>
          <span className="flex items-center justify-center" style={{ gap: 6 }}>
            <Download size={16} strokeWidth={1.5} aria-hidden />
            PDF
          </span>
        </Botao>
      </div>

      <header
        className="flex items-center"
        style={{ gap: 12, borderBottom: "1px solid var(--ln)", paddingBottom: 14 }}
      >
        <LogoAmeixa tamanho={38} />
        <div>
          <h1 style={{ fontSize: 22 }}>Relatório financeiro</h1>
          <p style={{ fontSize: 12, color: "var(--mut)" }}>
            {dataBr(de)} a {dataBr(ate)} · {dados.diasNoPeriodo} dias
          </p>
          <p style={{ fontSize: 11, color: "var(--mut)" }}>
            Emitido em {dataBr(new Date())}
            {nome ? ` por ${nome}` : ""}
          </p>
        </div>
      </header>

      {secoes.includes("resumo") ? (
        <section style={bloco}>
          {titulo("Resumo")}
          <div className="grid grid-cols-2" style={{ gap: 12 }}>
            <div>
              <p className="rotulo">Receitas</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ok)" }}>
                {v(dados.totalReceitas)}
              </p>
            </div>
            <div>
              <p className="rotulo">Despesas</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--bad)" }}>
                {v(dados.totalDespesas)}
              </p>
            </div>
            <div>
              <p className="rotulo">Saldo</p>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: saldo < 0 ? "var(--bad)" : "var(--ok)",
                }}
              >
                {v(saldo)}
              </p>
            </div>
            <div>
              <p className="rotulo">Lançamentos</p>
              <p style={{ fontSize: 18, fontWeight: 700 }}>
                {dados.despesasCruas.length + receitas.length}
              </p>
            </div>
          </div>

          {tecnicos ? (
            <div
              className="grid grid-cols-2"
              style={{ gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--ln2)" }}
            >
              {[
                ["Média diária de gasto", v(ind.mediaDiaria)],
                ["Ticket médio", v(ind.ticketMedio)],
                ["Maior despesa", v(ind.maiorDespesa)],
                ["Projeção mensal", v(ind.projecaoMensal)],
                [
                  "Variação vs. período anterior",
                  ind.variacao === null
                    ? "sem base de comparação"
                    : `${ind.variacao > 0 ? "+" : ""}${ind.variacao}%`,
                ],
                ["Participação do cartão", `${ind.participacaoCartao}%`],
                ["Dias sem gastar", String(ind.diasSemGastar)],
              ].map(([r, val]) => (
                <div key={r}>
                  <p className="rotulo">{r}</p>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{val}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {secoes.includes("categorias") ? (
        <section style={bloco}>
          {titulo("Gastos por categoria")}
          {ocultar ? (
            <ul className="flex flex-col" style={{ gap: 8 }}>
              {fatias.map((f) => (
                <li key={f.nome} className="flex justify-between" style={{ gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{f.nome}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{f.percentual}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <RoscaCategorias fatias={fatias} total={dados.totalDespesas} />
          )}
        </section>
      ) : null}

      {secoes.includes("evolucao") ? (
        <section style={bloco}>
          {titulo("Evolução mensal")}
          <BarrasEvolucao meses={dados.meses} />
        </section>
      ) : null}

      {secoes.includes("receitas") ? (
        <section style={bloco}>
          {titulo("Origem das receitas")}
          {receitas.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--mut)" }}>
              Nenhuma receita no período.
            </p>
          ) : (
            <ul className="flex flex-col" style={{ gap: 8 }}>
              {receitas.map((r) => (
                <li key={r.nome} className="flex justify-between" style={{ gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{r.nome}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {v(r.valor)} · {r.percentual}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {secoes.includes("orcamentos") ? (
        <section style={bloco}>
          {titulo("Orçamentos")}
          {orcamentos.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--mut)" }}>
              Nenhum orçamento definido.
            </p>
          ) : (
            <ul className="flex flex-col" style={{ gap: 8 }}>
              {orcamentos.map((o) => {
                const estado = estadoDoOrcamento(o.gasto, o.limite);
                return (
                  <li key={o.id} className="flex justify-between" style={{ gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{o.categoria}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: COR_ESTADO[estado] }}>
                      {v(o.gasto)} de {v(o.limite)} ·{" "}
                      {percentualDoOrcamento(o.gasto, o.limite)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {secoes.includes("metas") ? (
        <section style={bloco}>
          {titulo("Metas")}
          {metas.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--mut)" }}>Nenhuma meta criada.</p>
          ) : (
            <ul className="flex flex-col" style={{ gap: 8 }}>
              {metas.map((m) => (
                <li key={m.id} className="flex justify-between" style={{ gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{m.nome}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {v(m.guardado)} de {v(m.alvo)} · {percentualDaMeta(m)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {secoes.includes("detalhes") ? (
        <section style={bloco}>
          {titulo("Lançamentos detalhados")}
          {lancamentos.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--mut)" }}>
              Nenhum lançamento com as situações escolhidas.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--mut)", textAlign: "left" }}>
                    <th style={{ padding: "6px 4px" }}>Data</th>
                    <th style={{ padding: "6px 4px" }}>Descrição</th>
                    <th style={{ padding: "6px 4px" }}>Categoria</th>
                    <th style={{ padding: "6px 4px" }}>Situação</th>
                    <th style={{ padding: "6px 4px", textAlign: "right" }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((l) => (
                    <tr key={l.id} style={{ borderTop: "1px solid var(--ln2)" }}>
                      <td style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>
                        {dataBr(l.data_registro)}
                      </td>
                      <td style={{ padding: "6px 4px" }}>{l.descricao}</td>
                      <td style={{ padding: "6px 4px" }}>{l.categoria?.nome ?? "—"}</td>
                      <td style={{ padding: "6px 4px" }}>{ROTULO_SITUACAO[l.situacao]}</td>
                      <td
                        style={{
                          padding: "6px 4px",
                          textAlign: "right",
                          fontWeight: 600,
                          color:
                            l.tipo === "receita"
                              ? "var(--ok)"
                              : l.tipo === "aporte"
                                ? "var(--chart2)"
                                : "var(--bad)",
                        }}
                      >
                        {l.tipo === "receita" ? "+" : l.tipo === "aporte" ? "" : "−"}
                        {v(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <footer
        className="flex flex-col items-center"
        style={{ gap: 6, paddingTop: 8, paddingBottom: 8 }}
      >
        <p style={{ fontSize: 11, color: "var(--mut)" }}>
          Ameixa · gerado em {dataBr(new Date())}
        </p>
        <p style={{ fontSize: 10, color: "var(--mut)" }}>
          © {new Date().getFullYear()} Rapha. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
