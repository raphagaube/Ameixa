"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { excluirLancamentosEmLote } from "@/app/(app)/lancamentos/acoes";
import { Dinheiro } from "@/components/dinheiro";
import { Botao } from "@/components/ui/botao";
import { Segmentos } from "@/components/ui/segmentos";
import { atualizarAgendaNaTela } from "@/lib/agenda/atualizar-na-tela";
import { dataBr, moeda } from "@/lib/formato";
import { useOcupado } from "@/lib/use-ocupado";

export type LinhaCopia = {
  id: string;
  tipo: "receita" | "despesa";
  valor: number;
  descricao: string;
  /** aaaa-mm-dd */
  data: string;
  categoria: string | null;
  /** dd/mm/aaaa em que este lançamento foi gravado. */
  gravadoEm: string;
  /** dd/mm/aaaa em que foi gravado o lançamento que fica. */
  originalGravadoEm: string;
};

type Filtro = "tudo" | "receita" | "despesa";

/** Quantos ids por pedido: a lista vai no endereço, que tem tamanho máximo. */
const POR_PEDIDO = 100;

const caixa: React.CSSProperties = {
  borderRadius: "var(--r)",
  border: "1px solid var(--ln2)",
  background: "var(--sf)",
  padding: 14,
};

function Lista({
  itens,
  marcado,
  aoAlternar,
  desabilitado,
}: {
  itens: LinhaCopia[];
  marcado: (id: string) => boolean;
  aoAlternar: (id: string) => void;
  desabilitado: boolean;
}) {
  return (
    <ul className="flex flex-col">
      {itens.map((l) => (
        <li key={l.id} style={{ borderTop: "1px solid var(--ln2)" }}>
          <label className="flex items-center" style={{ gap: 10, minHeight: 44, padding: "6px 0" }}>
            <input
              type="checkbox"
              checked={marcado(l.id)}
              onChange={() => aoAlternar(l.id)}
              disabled={desabilitado}
              style={{ width: 18, height: 18, minHeight: 18, flexShrink: 0 }}
            />
            <span className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14 }}>
                <span style={{ color: "var(--mut)" }}>{dataBr(l.data)} · </span>
                {l.descricao}
              </span>
              <span style={{ fontSize: 12, color: "var(--mut)" }}>
                {l.categoria ?? "Sem categoria"} · gravado em {l.gravadoEm}; o que fica é de{" "}
                {l.originalGravadoEm}
              </span>
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                color: l.tipo === "receita" ? "var(--ok)" : "var(--bad)",
              }}
            >
              {l.tipo === "receita" ? "+" : "−"}
              <Dinheiro>{moeda(l.valor)}</Dinheiro>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * Limpeza de uma planilha importada duas vezes.
 *
 * As cópias certas já chegam marcadas; os "iguais para conferir" chegam
 * desmarcados. Nada sai sem o dono apertar o botão e confirmar: excluir não
 * tem volta, e a decisão é dele.
 */
export function PainelCopias({
  copias,
  paraConferir,
  marcarDeInicio,
}: {
  copias: LinhaCopia[];
  paraConferir: LinhaCopia[];
  marcarDeInicio: string[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  // Cópias: marcadas, menos as que o dono tirar. Para conferir: desmarcadas,
  // mais as que ele puser (ou as que o endereço já trouxe marcadas).
  const [fora, setFora] = useState<Set<string>>(new Set());
  const [extras, setExtras] = useState<Set<string>>(
    () => new Set(marcarDeInicio.filter((id) => paraConferir.some((l) => l.id === id))),
  );
  const [excluindo, iniciar] = useOcupado();
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const doFiltro = (l: LinhaCopia) => filtro === "tudo" || l.tipo === filtro;
  const copiasVisiveis = copias.filter(doFiltro);
  const conferirVisiveis = paraConferir.filter(doFiltro);

  const selecionados = [
    ...copiasVisiveis.filter((l) => !fora.has(l.id)),
    ...conferirVisiveis.filter((l) => extras.has(l.id)),
  ];
  const soma = (tipo: "receita" | "despesa") =>
    selecionados.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0);
  const quantos = (tipo: "receita" | "despesa") => selecionados.filter((l) => l.tipo === tipo).length;

  const alternar = (conjunto: Set<string>, gravar: (s: Set<string>) => void) => (id: string) => {
    const novo = new Set(conjunto);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    gravar(novo);
  };

  function excluir() {
    const ids = selecionados.map((l) => l.id);
    if (
      !window.confirm(
        `Excluir ${ids.length} ${ids.length === 1 ? "lançamento" : "lançamentos"}?\n\n` +
          "Excluir não tem volta. Os originais ficam no app.",
      )
    ) {
      return;
    }
    setErro(null);
    setRecado(null);
    iniciar(async () => {
      let feitos = 0;
      for (let k = 0; k < ids.length; k += POR_PEDIDO) {
        let r;
        try {
          r = await excluirLancamentosEmLote(ids.slice(k, k + POR_PEDIDO));
        } catch {
          r = { ok: false as const, erro: "A conexão caiu." };
        }
        if (!r.ok) {
          setErro(`Parei no meio: ${r.erro} ${feitos} já foram excluídos; abra a tela de novo para continuar.`);
          break;
        }
        feitos += r.excluidos;
        setProgresso(`${feitos} de ${ids.length} excluídos…`);
      }
      setProgresso(null);
      setRecado(`${feitos} ${feitos === 1 ? "lançamento excluído" : "lançamentos excluídos"}. Atualizando o Google Agenda…`);
      router.refresh();

      const restam = await atualizarAgendaNaTela();
      setRecado(
        `${feitos} ${feitos === 1 ? "lançamento excluído" : "lançamentos excluídos"}. ` +
          (restam > 0
            ? `${restam} ${restam === 1 ? "compromisso ficou" : "compromissos ficaram"} na fila do Google Agenda; em Ajustes, toque em Tentar agora.`
            : "Google Agenda atualizado."),
      );
    });
  }

  if (copias.length === 0 && paraConferir.length === 0) {
    return (
      <div className="flex flex-col" style={{ gap: 10 }}>
        {recado ? (
          <p role="status" style={{ fontSize: 13, color: "var(--mut)" }}>
            {recado}
          </p>
        ) : null}
        <p style={{ fontSize: 14, color: "var(--mut)", padding: "12px 0" }}>
          Nenhuma cópia de importação: não há lançamento importado que já existisse no app.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 14, paddingBottom: 150 }}>
      <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
        Lançamentos que uma importação gravou de novo: já existia no app outro igual em tipo, data,
        valor e descrição. O original fica; a cópia sai. Confira a lista antes de excluir — excluir
        não tem volta. Vale{" "}
        <Link href="/ajustes" style={{ color: "var(--deep)", fontWeight: 600 }}>
          baixar um backup
        </Link>{" "}
        antes.
      </p>

      <Segmentos
        rotulo="Mostrar"
        opcoes={[
          { valor: "tudo" as const, texto: "Tudo" },
          { valor: "receita" as const, texto: "Receitas" },
          { valor: "despesa" as const, texto: "Despesas" },
        ]}
        valor={filtro}
        aoEscolher={setFiltro}
      />

      <section style={caixa}>
        <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 16 }}>
            {copiasVisiveis.length} {copiasVisiveis.length === 1 ? "cópia" : "cópias"}
          </h2>
          {copiasVisiveis.length > 0 ? (
            <span className="flex" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  const novo = new Set(fora);
                  for (const l of copiasVisiveis) novo.delete(l.id);
                  setFora(novo);
                }}
                disabled={excluindo}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--deep)", background: "transparent", minHeight: 44 }}
              >
                Marcar todas
              </button>
              <button
                type="button"
                onClick={() => setFora(new Set([...fora, ...copiasVisiveis.map((l) => l.id)]))}
                disabled={excluindo}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--deep)", background: "transparent", minHeight: 44 }}
              >
                Desmarcar todas
              </button>
            </span>
          ) : null}
        </div>
        {copiasVisiveis.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 6 }}>Nenhuma neste filtro.</p>
        ) : (
          <Lista
            itens={copiasVisiveis}
            marcado={(id) => !fora.has(id)}
            aoAlternar={alternar(fora, setFora)}
            desabilitado={excluindo}
          />
        )}
      </section>

      {conferirVisiveis.length > 0 ? (
        <section style={caixa}>
          <h2 style={{ fontSize: 16 }}>
            {conferirVisiveis.length} {conferirVisiveis.length === 1 ? "igual" : "iguais"} para conferir
          </h2>
          <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5, margin: "4px 0 6px" }}>
            Iguais a outro lançamento, mas gravados junto com ele ou lançados à mão — podem ser dois
            gastos de verdade no mesmo dia. Chegam desmarcados: marque só os que forem repetição.
          </p>
          <Lista
            itens={conferirVisiveis}
            marcado={(id) => extras.has(id)}
            aoAlternar={alternar(extras, setExtras)}
            desabilitado={excluindo}
          />
        </section>
      ) : null}

      <div
        className="barra-rodape fixed inset-x-0 z-40 mx-auto"
        style={{
          bottom: "var(--rodape-fixo, calc(56px + env(safe-area-inset-bottom)))",
          maxWidth: "var(--largura)",
          padding: 12,
          background: "var(--sf)",
          borderTop: "1px solid var(--ln)",
        }}
      >
        <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8 }}>
          {selecionados.length} {selecionados.length === 1 ? "marcado" : "marcados"}: {quantos("receita")}{" "}
          {quantos("receita") === 1 ? "receita" : "receitas"} (<Dinheiro>{moeda(soma("receita"))}</Dinheiro>) e{" "}
          {quantos("despesa")} {quantos("despesa") === 1 ? "despesa" : "despesas"} (
          <Dinheiro>{moeda(soma("despesa"))}</Dinheiro>).
        </p>
        {progresso ? (
          <p role="status" style={{ fontSize: 12, marginBottom: 8 }}>
            {progresso}
          </p>
        ) : null}
        {recado ? (
          <p role="status" style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8 }}>
            {recado}
          </p>
        ) : null}
        {erro ? (
          <p role="alert" style={{ fontSize: 12, color: "var(--bad)", marginBottom: 8 }}>
            {erro}
          </p>
        ) : null}
        <Botao onClick={excluir} carregando={excluindo} disabled={selecionados.length === 0}>
          Excluir {selecionados.length} {selecionados.length === 1 ? "lançamento" : "lançamentos"}
        </Botao>
      </div>
    </div>
  );
}
