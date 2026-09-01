import { dataBr } from "@/lib/formato";
import type { DadosRelatorio } from "@/lib/dados/relatorios";
import { ROTULO_SITUACAO, type LancamentoNaLista } from "@/lib/tipos/lancamentos";

/**
 * Exportação para planilha.
 *
 * Gera CSV com ponto e vírgula e BOM UTF-8: é o que o Excel em português
 * abre com as colunas já separadas e os acentos corretos. Vírgula como
 * separador brigaria com a vírgula decimal do real.
 */

function escapar(v: unknown): string {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function numeroBr(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function montarCsv(linhas: (string | number)[][]): string {
  return linhas.map((l) => l.map(escapar).join(";")).join("\r\n");
}

function baixar(nomeArquivo: string, conteudo: string) {
  // BOM na frente, senão o Excel lê os acentos como lixo.
  const blob = new Blob([`﻿${conteudo}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function baixarExcel(
  lancamentos: LancamentoNaLista[],
  dados: DadosRelatorio,
  info: { de: string; ate: string; nome: string },
) {
  const linhas: (string | number)[][] = [
    ["Relatório financeiro — Ameixa"],
    ["Período", `${dataBr(info.de)} a ${dataBr(info.ate)}`],
    ["Emitido por", info.nome],
    [],
    ["RESUMO"],
    ["Receitas", numeroBr(dados.totalReceitas)],
    ["Despesas", numeroBr(dados.totalDespesas)],
    ["Saldo", numeroBr(dados.totalReceitas - dados.totalDespesas)],
    [],
    ["DESPESAS POR CATEGORIA"],
    ["Categoria", "Valor"],
    ...dados.despesasPorCategoria.map((c) => [c.nome, numeroBr(c.valor)]),
    [],
    ["RECEITAS POR CATEGORIA"],
    ["Categoria", "Valor"],
    ...dados.receitasPorCategoria.map((c) => [c.nome, numeroBr(c.valor)]),
    [],
    ["EVOLUÇÃO MENSAL"],
    ["Mês", "Receitas", "Despesas", "Saldo"],
    ...dados.meses.map((m) => [
      m.rotulo,
      numeroBr(m.receitas),
      numeroBr(m.despesas),
      numeroBr(m.receitas - m.despesas),
    ]),
  ];

  if (lancamentos.length > 0) {
    linhas.push(
      [],
      ["LANÇAMENTOS"],
      [
        "Data",
        "Descrição",
        "Tipo",
        "Categoria",
        "Subcategoria",
        "Conta",
        "Cartão",
        "Forma",
        "Situação",
        "Responsável",
        "Valor",
      ],
      ...lancamentos.map((l) => [
        dataBr(l.data_registro),
        l.descricao,
        l.tipo,
        l.categoria?.nome ?? "",
        l.subcategoria?.nome ?? "",
        l.conta?.nome ?? "",
        l.cartao?.nome ?? "",
        l.forma_pagamento ?? "",
        ROTULO_SITUACAO[l.situacao],
        l.responsavel ?? "",
        numeroBr(l.valor),
      ]),
    );
  }

  baixar(`ameixa-${info.de}-a-${info.ate}.csv`, montarCsv(linhas));
}

/** Backup completo em JSON, para Ajustes → Dados. */
export function baixarJson(dados: unknown, nomeArquivo: string) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
