"use client";

import { FileDown, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Dinheiro } from "@/components/dinheiro";
import { LogoAmeixa } from "@/components/logo-ameixa";
import { Botao } from "@/components/ui/botao";
import {
  nomeDoExtrato,
  sinalDoTipo,
  totaisDoExtrato,
  type DatasPor,
} from "@/lib/extrato-impresso";
import { dataBr, hojeEmBrasilia, moeda } from "@/lib/formato";
import { baixarArquivo, podeCompartilharArquivo } from "@/lib/pdf";
import { estaOculto } from "@/lib/privacidade";
import { ROTULO_SITUACAO, type LancamentoNaLista } from "@/lib/tipos/lancamentos";
import { useOcupado } from "@/lib/use-ocupado";

/**
 * O extrato em forma de documento: o que está aqui é o que sai no papel.
 *
 * Dois caminhos para a mesma lista. "Exportar em PDF" monta o arquivo a
 * partir dos dados — texto de verdade, folha branca, páginas numeradas — e
 * abre a bandeja de compartilhar do celular. "Imprimir" usa a impressão do
 * navegador sobre esta tela, que as regras de `@media print` limpam.
 */
export function DocumentoExtrato({
  lancamentos,
  nome,
  de,
  ate,
  datasPor,
  filtros,
  cortado,
}: {
  lancamentos: LancamentoNaLista[];
  nome: string;
  de: string;
  ate: string;
  datasPor: DatasPor;
  filtros: string[];
  cortado: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [aviso, setAviso] = useState<string | null>(null);
  const [gerando, iniciarGerar] = useOcupado();

  const t = totaisDoExtrato(lancamentos);

  function exportarPdf() {
    setAviso(null);
    iniciarGerar(async () => {
      let arquivo: File;
      try {
        const { montarPdfExtrato } = await import("@/lib/pdf-extrato");
        const blob = await montarPdfExtrato({
          nome,
          de,
          ate,
          datasPor,
          filtros,
          // No papel o borrão da tela não existe: com o modo privado ligado,
          // os valores saem trocados por pontinhos.
          ocultar: estaOculto(),
          lancamentos,
          cortado,
        });
        arquivo = new File([blob], nomeDoExtrato(de, ate), { type: "application/pdf" });
      } catch {
        setAviso("Não deu para montar o PDF. Tente usar o botão Imprimir.");
        return;
      }

      if (podeCompartilharArquivo(arquivo)) {
        try {
          await navigator.share({
            files: [arquivo],
            title: "Extrato",
            text: `Extrato de ${dataBr(de)} a ${dataBr(ate)}`,
          });
          return;
        } catch (e) {
          // Cancelar a bandeja não é erro; qualquer outra coisa vira download.
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }

      baixarArquivo(arquivo);
      setAviso("O PDF foi salvo nos downloads.");
    });
  }

  const celula: React.CSSProperties = { padding: "6px 4px" };

  return (
    <div className="flex flex-col" style={{ gap: 16, paddingTop: 22 }}>
      <div className="flex flex-col nao-imprimir" style={{ gap: 8 }}>
        <Botao onClick={exportarPdf} carregando={gerando}>
          <span className="flex items-center justify-center" style={{ gap: 8 }}>
            <FileDown size={18} strokeWidth={1.5} aria-hidden />
            Exportar em PDF
          </span>
        </Botao>

        <div className="flex" style={{ gap: 8 }}>
          <Botao
            variante="contorno"
            onClick={() => router.push(`/extrato?${params.toString()}`)}
            disabled={gerando}
          >
            Voltar
          </Botao>
          <Botao variante="contorno" onClick={() => window.print()} disabled={gerando}>
            <span className="flex items-center justify-center" style={{ gap: 6 }}>
              <Printer size={16} strokeWidth={1.5} aria-hidden />
              Imprimir
            </span>
          </Botao>
        </div>

        {aviso ? (
          <p
            role="status"
            style={{
              fontSize: 12,
              color: "var(--mut)",
              background: "var(--tint)",
              borderRadius: "var(--rs)",
              padding: 10,
            }}
          >
            {aviso}
          </p>
        ) : null}
      </div>

      <header
        className="flex items-center"
        style={{ gap: 12, borderBottom: "1px solid var(--ln)", paddingBottom: 14 }}
      >
        <LogoAmeixa tamanho={38} />
        <div>
          <h1 style={{ fontSize: 22 }}>Extrato</h1>
          <p style={{ fontSize: 12, color: "var(--mut)" }}>
            {dataBr(de)} a {dataBr(ate)} ·{" "}
            {datasPor === "vencimento" ? "pelo vencimento" : "pela data do registro"}
          </p>
          {filtros.length > 0 ? (
            <p style={{ fontSize: 12, color: "var(--mut)" }}>Filtros: {filtros.join(", ")}.</p>
          ) : null}
        </div>
      </header>

      <section className="grid grid-cols-2" style={{ gap: 12 }}>
        <div>
          <p className="rotulo">Receitas</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--ok)" }}>
            <Dinheiro>{moeda(t.receitas)}</Dinheiro>
          </p>
        </div>
        <div>
          <p className="rotulo">Despesas</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: "var(--bad)" }}>
            <Dinheiro>{moeda(t.despesas)}</Dinheiro>
          </p>
        </div>
        <div>
          <p className="rotulo">Saldo do período</p>
          <p
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: t.saldo < 0 ? "var(--bad)" : "var(--ok)",
            }}
          >
            {t.saldo < 0 ? "−" : "+"}
            <Dinheiro>{moeda(Math.abs(t.saldo))}</Dinheiro>
          </p>
        </div>
        <div>
          <p className="rotulo">Lançamentos</p>
          <p style={{ fontSize: 17, fontWeight: 600 }}>{t.quantidade}</p>
        </div>
      </section>

      {t.aportes > 0 ? (
        <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>
          {t.aportes === 1
            ? "1 aporte em meta aparece na lista, mas não entra em receitas nem em despesas."
            : `${t.aportes} aportes em metas aparecem na lista, mas não entram em receitas nem em despesas.`}
        </p>
      ) : null}

      {lancamentos.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--mut)" }}>
          Nenhum lançamento neste período com esses filtros.
        </p>
      ) : (
        // Não é <section>: a regra de impressão que impede seção de se partir
        // jogaria uma tabela de várias páginas inteira para a folha seguinte.
        <div style={{ overflowX: "auto" }}>
          <table
            className="tabela-lancamentos"
            style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ color: "var(--mut)", textAlign: "left" }}>
                <th style={celula}>Data</th>
                <th style={celula}>Vencimento</th>
                <th style={celula}>Descrição</th>
                <th style={celula}>Categoria</th>
                <th style={celula}>Situação</th>
                <th style={{ ...celula, textAlign: "right" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--ln2)" }}>
                  <td data-rotulo="Data" style={{ ...celula, whiteSpace: "nowrap" }}>
                    {dataBr(l.data_registro.slice(0, 10))}
                  </td>
                  <td data-rotulo="Vencimento" style={{ ...celula, whiteSpace: "nowrap" }}>
                    {l.data_vencimento ? dataBr(l.data_vencimento.slice(0, 10)) : "—"}
                  </td>
                  <td data-rotulo="Descrição" style={celula}>
                    {l.descricao}
                  </td>
                  <td data-rotulo="Categoria" style={celula}>
                    {l.categoria?.nome ?? "—"}
                    {l.subcategoria?.nome ? (
                      <span style={{ color: "var(--mut)" }}>
                        {" › "}
                        {l.subcategoria.nome}
                      </span>
                    ) : null}
                  </td>
                  <td data-rotulo="Situação" style={celula}>
                    {ROTULO_SITUACAO[l.situacao]}
                  </td>
                  <td
                    data-rotulo="Valor"
                    style={{
                      ...celula,
                      textAlign: "right",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      color:
                        l.tipo === "receita"
                          ? "var(--ok)"
                          : l.tipo === "aporte"
                            ? "var(--chart2)"
                            : "var(--bad)",
                    }}
                  >
                    {sinalDoTipo(l.tipo)}
                    <Dinheiro>{moeda(l.valor)}</Dinheiro>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cortado ? (
        <p style={{ fontSize: 12, color: "var(--bad)", lineHeight: 1.5 }}>
          A lista para nos primeiros {lancamentos.length} lançamentos. Escolha um período menor
          para ver o resto.
        </p>
      ) : null}

      <footer
        className="flex flex-col items-center"
        style={{ gap: 6, paddingTop: 8, paddingBottom: 8 }}
      >
        <p style={{ fontSize: 11, color: "var(--mut)" }}>
          Ameixa · gerado em {dataBr(hojeEmBrasilia())}
          {nome ? ` por ${nome}` : ""}
        </p>
        <p style={{ fontSize: 10, color: "var(--mut)" }}>
          © {new Date().getFullYear()} Rapha. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
