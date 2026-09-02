"use client";

import {
  CircleCheck,
  FileSpreadsheet,
  FileText,
  Link2,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { lerCsv, type LinhaCru } from "@/lib/csv";
import { dataBr, moeda } from "@/lib/formato";
import {
  CAMPOS,
  analisarLinhas,
  casarCategoria,
  palpitarMapeamento,
  resumir,
  type CampoAlvo,
  type Mapeamento,
} from "@/lib/importacao";
import { importarLancamentos } from "@/app/(app)/ajustes/importar";
import { buscarPlanilhaGoogle } from "./buscar-planilha";
import { Dinheiro } from "@/components/dinheiro";

type Origem = "google" | "arquivo" | "backup";
type Passo = 1 | 2 | 3 | 4;

type Ref = { id: string; nome: string; cor?: string };
type Cat = { id: string; nome: string; tipo: "despesa" | "receita" };

export function Assistente({
  contas,
  categorias,
}: {
  contas: Ref[];
  categorias: Cat[];
}) {
  const router = useRouter();

  const [passo, setPasso] = useState<Passo>(1);
  const [origem, setOrigem] = useState<Origem>("google");
  const [link, setLink] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");

  const [brutas, setBrutas] = useState<LinhaCru[]>([]);
  const [mapa, setMapa] = useState<Mapeamento>({});
  const [contaId, setContaId] = useState<string>("");
  const [usarCategoria, setUsarCategoria] = useState(true);

  const [erro, setErro] = useState<string | null>(null);
  const [repetidas, setRepetidas] = useState<number | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const colunas = brutas.length > 0 ? Object.keys(brutas[0]) : [];
  const previas = useMemo(() => analisarLinhas(brutas, mapa), [brutas, mapa]);
  const resumo = useMemo(() => resumir(previas), [previas]);

  const faltaObrigatorio = CAMPOS.filter((c) => c.obrigatorio && !mapa[c.campo]);

  /** Quantas linhas vão receber categoria automática. */
  const comCategoria = useMemo(() => {
    if (!usarCategoria || !mapa.categoria) return 0;
    return previas.filter(
      (p) => !p.problema && casarCategoria(p.categoriaTexto, categorias, p.tipo),
    ).length;
  }, [previas, mapa.categoria, usarCategoria, categorias]);

  function receberCsv(texto: string, nome: string) {
    const linhas = lerCsv(texto);
    if (linhas.length === 0) {
      setErro("O arquivo não tem linhas além do cabeçalho.");
      return;
    }
    setNomeArquivo(nome);
    setBrutas(linhas);
    setMapa(palpitarMapeamento(Object.keys(linhas[0])));
    setErro(null);
    setPasso(2);
  }

  function buscarDoGoogle() {
    setErro(null);
    iniciar(async () => {
      const r = await buscarPlanilhaGoogle(link);
      if (r.ok) receberCsv(r.csv, "Planilha Google");
      else setErro(r.erro);
    });
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);

    const nome = arquivo.name.toLowerCase();
    try {
      if (nome.endsWith(".xlsx") || nome.endsWith(".xls")) {
        const { lerExcel } = await import("@/lib/excel");
        const linhas = lerExcel(await arquivo.arrayBuffer());
        if (linhas.length === 0) {
          setErro("A planilha não tem linhas além do cabeçalho.");
          return;
        }
        setNomeArquivo(arquivo.name);
        setBrutas(linhas);
        setMapa(palpitarMapeamento(Object.keys(linhas[0])));
        setPasso(2);
      } else {
        receberCsv(await arquivo.text(), arquivo.name);
      }
    } catch {
      setErro("Não consegui ler esse arquivo. Aceito Excel (.xlsx) e CSV.");
    } finally {
      e.target.value = "";
    }
  }

  async function aoEscolherBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    try {
      const json = JSON.parse(await arquivo.text());
      const brutos = Array.isArray(json) ? json : (json.lancamentos ?? []);
      const linhas: LinhaCru[] = (brutos as Record<string, unknown>[]).map((l) => ({
        data: String(l.data_registro ?? "").slice(0, 10),
        descricao: String(l.descricao ?? ""),
        valor: String(l.valor ?? ""),
        tipo: String(l.tipo ?? ""),
        status: String(l.situacao ?? ""),
        observacao: String(l.observacao ?? ""),
        responsavel: String(l.responsavel ?? ""),
      }));
      if (linhas.length === 0) {
        setErro("Esse backup não tem lançamentos.");
        return;
      }
      setNomeArquivo(arquivo.name);
      setBrutas(linhas);
      setMapa(palpitarMapeamento(Object.keys(linhas[0])));
      setPasso(2);
    } catch {
      setErro("Esse arquivo não é um backup válido do Ameixa.");
    } finally {
      e.target.value = "";
    }
  }

  function gravar(quantoARepetidos: "perguntar" | "importar" | "pular" = "perguntar") {
    setErro(null);
    iniciar(async () => {
      const paraEnviar = previas
        .filter((p) => !p.problema)
        .map((p) => ({
          tipo: p.tipo,
          valor: Math.abs(p.valor!),
          descricao: p.descricao,
          data_registro: p.data!,
          situacao: p.situacao,
          categoria_id:
            usarCategoria && mapa.categoria
              ? casarCategoria(p.categoriaTexto, categorias, p.tipo)
              : null,
          conta_id: contaId || null,
          responsavel: p.responsavel,
          // Guarda o nome original da categoria, para não se perder quando
          // não houver correspondente no app.
          observacao:
            [p.observacao, p.categoriaTexto].filter(Boolean).join(" · ") || null,
        }));

      const r = await importarLancamentos(paraEnviar, quantoARepetidos);
      if (r.ok) {
        setSucesso(
          `${r.criados} lançamentos importados.` +
            (r.pendentes > 0
              ? ` ${r.pendentes} ficaram em Pendências, esperando categoria.`
              : " Todos já com categoria."),
        );
        setPasso(4);
        router.refresh();
      } else if ("repetidos" in r) {
        // Não decido por ele: duplicar dobra o gasto do mês, e pular pode
        // esconder um gasto que aconteceu duas vezes de verdade.
        setRepetidas(r.repetidos);
        setErro(r.erro);
      } else {
        setErro(r.erro);
      }
    });
  }

  function reenviar(decisao: "importar" | "pular") {
    setRepetidas(null);
    setErro(null);
    // O estado só vale no próximo render; manda a decisão direto.
    gravar(decisao);
  }

  const caixa: React.CSSProperties = {
    borderRadius: "var(--r)",
    border: "1px solid var(--ln2)",
    background: "var(--sf)",
    padding: 14,
  };

  const estiloSelect: React.CSSProperties = {
    padding: 10,
    fontSize: 14,
    borderRadius: "var(--rs)",
    border: "1px solid var(--ln)",
    background: "var(--sf)",
    color: "var(--color-text)",
    width: "100%",
  };

  const opcaoOrigem = (
    valor: Origem,
    Icone: typeof Link2,
    titulo: string,
    detalhe: string,
  ) => (
    <button
      key={valor}
      type="button"
      onClick={() => setOrigem(valor)}
      aria-pressed={origem === valor}
      className="flex items-start text-left"
      style={{
        gap: 10,
        padding: 14,
        borderRadius: "var(--r)",
        border: `1px solid ${origem === valor ? "var(--deep)" : "var(--ln)"}`,
        background: origem === valor ? "var(--tint)" : "transparent",
        color: "var(--color-text)",
        minHeight: 64,
      }}
    >
      <Icone
        size={20}
        strokeWidth={1.5}
        style={{ color: "var(--deep)", flexShrink: 0, marginTop: 2 }}
        aria-hidden
      />
      <span>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>
          {titulo}
        </span>
        <span style={{ display: "block", fontSize: 12, color: "var(--mut)" }}>
          {detalhe}
        </span>
      </span>
    </button>
  );

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* Trilha dos passos */}
      <ol className="flex items-center" style={{ gap: 6 }}>
        {[1, 2, 3, 4].map((n) => (
          <li key={n} className="flex flex-1 items-center" style={{ gap: 6 }}>
            <span
              className="grid place-items-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 700,
                background: passo >= n ? "var(--deep)" : "var(--ln2)",
                color: passo >= n ? "var(--on-ac)" : "var(--mut)",
              }}
            >
              {n}
            </span>
            {n < 4 ? (
              <span
                aria-hidden
                style={{
                  flex: 1,
                  height: 2,
                  background: passo > n ? "var(--deep)" : "var(--ln2)",
                }}
              />
            ) : null}
          </li>
        ))}
      </ol>

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

      {/* ── Passo 1: de onde vem ───────────────────────────── */}
      {passo === 1 ? (
        <>
          <h2 style={{ fontSize: 17 }}>De onde vêm os lançamentos?</h2>

          <div className="flex flex-col" style={{ gap: 8 }}>
            {opcaoOrigem(
              "google",
              Link2,
              "Planilhas Google",
              "Cole o link da planilha",
            )}
            {opcaoOrigem(
              "arquivo",
              FileSpreadsheet,
              "Excel ou CSV",
              "Arquivo .xlsx, .xls ou .csv do aparelho",
            )}
            {opcaoOrigem(
              "backup",
              FileText,
              "Backup do Ameixa",
              "Arquivo .json baixado em Ajustes",
            )}
          </div>

          {origem === "google" ? (
            <div className="flex flex-col" style={{ ...caixa, gap: 10 }}>
              <Campo
                rotulo="Link da planilha"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                inputMode="url"
              />
              <p style={{ fontSize: 12, color: "var(--mut)" }}>
                Abra a planilha, copie o endereço da barra do navegador e cole
                aqui. Em <strong>Compartilhar</strong>, ela precisa estar como
                “Qualquer pessoa com o link”.
              </p>
              <Botao
                onClick={buscarDoGoogle}
                carregando={ocupado}
                disabled={!link.trim()}
              >
                Ler planilha
              </Botao>
            </div>
          ) : null}

          {origem === "arquivo" ? (
            <label
              className="flex items-center justify-center"
              style={{
                gap: 8,
                minHeight: 52,
                borderRadius: "var(--rs)",
                border: "1px dashed var(--ln)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 12,
              }}
            >
              <FileSpreadsheet size={18} strokeWidth={1.5} aria-hidden />
              Escolher arquivo
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={aoEscolherArquivo}
                style={{ display: "none" }}
              />
            </label>
          ) : null}

          {origem === "backup" ? (
            <label
              className="flex items-center justify-center"
              style={{
                gap: 8,
                minHeight: 52,
                borderRadius: "var(--rs)",
                border: "1px dashed var(--ln)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 12,
              }}
            >
              <FileText size={18} strokeWidth={1.5} aria-hidden />
              Escolher backup .json
              <input
                type="file"
                accept=".json"
                onChange={aoEscolherBackup}
                style={{ display: "none" }}
              />
            </label>
          ) : null}
        </>
      ) : null}

      {/* ── Passo 2: conferir as colunas ────────────────────── */}
      {passo === 2 ? (
        <>
          <div>
            <h2 style={{ fontSize: 17 }}>Confira as colunas</h2>
            <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 4 }}>
              Li {brutas.length} linhas de {nomeArquivo}. Isto é o que entendi —
              corrija se eu tiver errado.
            </p>
          </div>

          <div style={caixa} className="flex flex-col">
            {CAMPOS.map(({ campo, rotulo, obrigatorio }) => (
              <div
                key={campo}
                className="flex flex-col"
                style={{ gap: 6, paddingBottom: 12 }}
              >
                <label htmlFor={`mapa-${campo}`} className="rotulo">
                  {rotulo}
                  {obrigatorio ? " *" : ""}
                </label>
                <select
                  id={`mapa-${campo}`}
                  value={mapa[campo] ?? ""}
                  onChange={(e) =>
                    setMapa({
                      ...mapa,
                      [campo as CampoAlvo]: e.target.value || undefined,
                    })
                  }
                  style={{
                    ...estiloSelect,
                    borderColor:
                      obrigatorio && !mapa[campo] ? "var(--bad)" : "var(--ln)",
                  }}
                >
                  <option value="">
                    {obrigatorio ? "— escolha a coluna —" : "— não usar —"}
                  </option>
                  {colunas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {faltaObrigatorio.length > 0 ? (
            <p
              className="flex items-start"
              style={{ gap: 8, fontSize: 13, color: "var(--bad)" }}
            >
              <TriangleAlert size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
              Escolha a coluna de{" "}
              {faltaObrigatorio.map((c) => c.rotulo.toLowerCase()).join(", ")}.
            </p>
          ) : null}

          <div className="flex" style={{ gap: 8 }}>
            <Botao variante="contorno" onClick={() => setPasso(1)}>
              Voltar
            </Botao>
            <Botao
              onClick={() => setPasso(3)}
              disabled={faltaObrigatorio.length > 0}
            >
              Ver prévia
            </Botao>
          </div>
        </>
      ) : null}

      {/* ── Passo 3: prévia e confirmação ───────────────────── */}
      {passo === 3 ? (
        <>
          <h2 style={{ fontSize: 17 }}>Confira antes de gravar</h2>

          <div style={caixa}>
            <div className="grid grid-cols-2" style={{ gap: 12 }}>
              <div>
                <p className="rotulo">Vão entrar</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--ok)" }}>
                  {resumo.validas}
                </p>
              </div>
              <div>
                <p className="rotulo">Ficam de fora</p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: resumo.comProblema > 0 ? "var(--bad)" : "var(--mut)",
                  }}
                >
                  {resumo.comProblema}
                </p>
              </div>
              <div>
                <p className="rotulo">Receitas</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ok)" }}>
                  <Dinheiro>{moeda(resumo.somaReceitas)}</Dinheiro>
                </p>
              </div>
              <div>
                <p className="rotulo">Despesas</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--bad)" }}>
                  <Dinheiro>{moeda(resumo.somaDespesas)}</Dinheiro>
                </p>
              </div>
            </div>

            {resumo.primeiraData ? (
              <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 10 }}>
                Período: {dataBr(resumo.primeiraData)} a{" "}
                {dataBr(resumo.ultimaData!)}
              </p>
            ) : null}
          </div>

          <div style={caixa} className="flex flex-col">
            <p className="rotulo" style={{ marginBottom: 8 }}>
              Primeiras linhas
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--mut)", textAlign: "left" }}>
                    <th style={{ padding: "4px 6px" }}>Data</th>
                    <th style={{ padding: "4px 6px" }}>Descrição</th>
                    <th style={{ padding: "4px 6px", textAlign: "right" }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {previas.slice(0, 6).map((p) => (
                    <tr key={p.numero} style={{ borderTop: "1px solid var(--ln2)" }}>
                      <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                        {p.data ? dataBr(p.data) : "—"}
                      </td>
                      <td style={{ padding: "4px 6px" }}>{p.descricao || "—"}</td>
                      <td
                        style={{
                          padding: "4px 6px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: p.tipo === "receita" ? "var(--ok)" : "var(--bad)",
                        }}
                      >
                        <Dinheiro>{p.valor === null ? "—" : moeda(Math.abs(p.valor))}</Dinheiro>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {resumo.comProblema > 0 ? (
            <div style={{ ...caixa, borderColor: "var(--bad)" }}>
              <p
                className="flex items-center"
                style={{ gap: 8, fontSize: 14, fontWeight: 600, color: "var(--bad)" }}
              >
                <TriangleAlert size={16} strokeWidth={1.5} aria-hidden />
                {resumo.comProblema} linha{resumo.comProblema > 1 ? "s" : ""} ficará
                {resumo.comProblema > 1 ? "ão" : ""} de fora
              </p>
              <ul style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>
                {previas
                  .filter((p) => p.problema)
                  .slice(0, 5)
                  .map((p) => (
                    <li key={p.numero}>
                      Linha {p.numero}: {p.problema}
                    </li>
                  ))}
                {resumo.comProblema > 5 ? <li>e mais {resumo.comProblema - 5}…</li> : null}
              </ul>
            </div>
          ) : null}

          <div style={caixa} className="flex flex-col">
            <label htmlFor="conta-import" className="rotulo">
              Conta destes lançamentos
            </label>
            <select
              id="conta-import"
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              style={{ ...estiloSelect, marginTop: 6 }}
            >
              <option value="">— deixar sem conta —</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {contas.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>
                Você ainda não cadastrou bancos. Dá para importar assim e
                escolher depois.
              </p>
            ) : null}
          </div>

          {mapa.categoria ? (
            <button
              type="button"
              onClick={() => setUsarCategoria(!usarCategoria)}
              aria-pressed={usarCategoria}
              className="flex items-start text-left"
              style={{
                ...caixa,
                gap: 10,
                borderColor: usarCategoria ? "var(--deep)" : "var(--ln2)",
                background: usarCategoria ? "var(--tint)" : "var(--sf)",
                display: "flex",
              }}
            >
              <CircleCheck
                size={20}
                strokeWidth={1.5}
                style={{
                  color: usarCategoria ? "var(--deep)" : "var(--mut)",
                  flexShrink: 0,
                  marginTop: 2,
                }}
                aria-hidden
              />
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>
                  Casar categorias pelo nome
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--mut)" }}>
                  {comCategoria} de {resumo.validas} lançamentos já sairiam com
                  categoria. O resto fica em Pendências.
                </span>
              </span>
            </button>
          ) : null}

          <div className="flex" style={{ gap: 8 }}>
            <Botao variante="contorno" onClick={() => setPasso(2)} disabled={ocupado}>
              Voltar
            </Botao>
            <Botao
              onClick={() => gravar()}
              carregando={ocupado}
              disabled={resumo.validas === 0}
            >
              Importar {resumo.validas}
            </Botao>
          </div>

          {/* A escolha fica com o dono: duplicar dobra o gasto do mês, e
              pular pode esconder um gasto que aconteceu duas vezes mesmo. */}
          {repetidas !== null ? (
            <div
              role="alert"
              className="flex flex-col"
              style={{
                gap: 10,
                padding: 14,
                borderRadius: "var(--r)",
                border: "1px solid var(--warn, var(--ln))",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600 }}>
                {repetidas} linha{repetidas > 1 ? "s" : ""} já {repetidas > 1 ? "estão" : "está"} no app
              </p>
              <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
                Mesma data, mesmo valor e mesma descrição. Pode ser
                reimportação do mesmo arquivo — ou um gasto que aconteceu
                duas vezes de verdade.
              </p>
              <div className="flex" style={{ gap: 8 }}>
                <Botao
                  variante="contorno"
                  onClick={() => reenviar("pular")}
                  disabled={ocupado}
                >
                  Pular as repetidas
                </Botao>
                <Botao onClick={() => reenviar("importar")} disabled={ocupado}>
                  Importar mesmo assim
                </Botao>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ── Passo 4: pronto ─────────────────────────────────── */}
      {passo === 4 ? (
        <div style={caixa} className="flex flex-col" >
          <CircleCheck
            size={32}
            strokeWidth={1.5}
            style={{ color: "var(--ok)" }}
            aria-hidden
          />
          <h2 style={{ fontSize: 21, marginTop: 10 }}>Importado</h2>
          <p style={{ fontSize: 14, color: "var(--mut)", marginTop: 6 }}>{sucesso}</p>

          <div className="flex flex-col" style={{ gap: 8, marginTop: 16 }}>
            <Botao onClick={() => router.push("/extrato")}>Ver no extrato</Botao>
            <Botao variante="contorno" onClick={() => router.push("/pendencias")}>
              Ir para Pendências
            </Botao>
            <Botao
              variante="texto"
              onClick={() => {
                setPasso(1);
                setBrutas([]);
                setLink("");
                setSucesso(null);
              }}
            >
              Importar outro arquivo
            </Botao>
          </div>
        </div>
      ) : null}
    </div>
  );
}
