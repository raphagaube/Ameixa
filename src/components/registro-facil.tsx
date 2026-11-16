"use client";

import { Delete } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Folha } from "@/components/ui/folha";
import { moeda } from "@/lib/formato";
import { acaoDaTecla } from "@/lib/teclado-valor";
import type { Conta } from "@/lib/tipos/contas";
import { ROTULO_SITUACAO, situacoesDoTipo, type Situacao } from "@/lib/tipos/lancamentos";
import { salvarRapido } from "@/app/(app)/lancamentos/acoes";
import { Dinheiro } from "@/components/dinheiro";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "apagar"];

/** Centavos digitados viram reais: "1250" → 12,50 */
function paraNumero(digitos: string): number {
  return digitos === "" ? 0 : Number(digitos) / 100;
}

export function RegistroFacil({
  aberta,
  aoFechar,
  contas,
  aoDetalhar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  contas: Conta[];
  aoDetalhar: (valor: number, tipo: "despesa" | "receita", contaId: string | null, situacao: Situacao | null) => void;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [digitos, setDigitos] = useState("");
  const [contaId, setContaId] = useState<string | null>(null);
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const valor = paraNumero(digitos);

  function teclar(t: string) {
    setErro(null);
    if (t === "apagar") {
      setDigitos((d) => d.slice(0, -1));
      return;
    }
    // A vírgula é decorativa: o valor é montado em centavos, então digitar
    // "1250" já significa 12,50 e não há estado intermediário para quebrar.
    if (t === ",") return;
    setDigitos((d) => (d.length >= 9 ? d : (d + t).replace(/^0+(?=\d)/, "")));
  }

  function fecharLimpo() {
    setDigitos("");
    setSituacao(null);
    setErro(null);
    aoFechar();
  }

  function completarDepois() {
    setErro(null);
    if (valor <= 0) {
      setErro("Digite um valor primeiro.");
      return;
    }
    if (!situacao) {
      setErro("Escolha a situação do lançamento.");
      return;
    }
    iniciar(async () => {
      const r = await salvarRapido(valor, tipo, contaId, situacao);
      if (r.ok) {
        fecharLimpo();
        router.refresh();
      } else {
        setErro(r.erro);
      }
    });
  }

  function detalharAgora() {
    setErro(null);
    const v = valor;
    const t = tipo;
    const c = contaId;
    const s = situacao;
    setDigitos("");
    setSituacao(null);
    aoDetalhar(v, t, c, s);
  }

  /**
   * Teclado físico do computador.
   *
   * No celular o teclado da tela basta. No computador, quem abre isso
   * espera digitar — e como o valor é um mostrador, e não um campo, o
   * navegador não tem onde entregar as teclas sozinho. Daí ouvir a janela.
   *
   * O ouvinte fica numa ref, no mesmo molde da Folha: se ele entrasse nas
   * dependências do efeito, o efeito se remontaria a cada dígito.
   */
  const aoTeclado = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    aoTeclado.current = (e: KeyboardEvent) => {
      const acao = acaoDaTecla({
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        alvo: (e.target as HTMLElement | null)?.tagName,
      });
      if (!acao) return;

      // Backspace fora de um campo faz o navegador voltar de página em
      // algumas configurações. Aqui ela é "apagar o último número".
      e.preventDefault();

      if (acao.tipo === "digito") teclar(acao.valor);
      else if (acao.tipo === "apagar") teclar("apagar");
      else completarDepois();
    };
  });

  useEffect(() => {
    if (!aberta) return;
    const ouvir = (e: KeyboardEvent) => aoTeclado.current(e);
    window.addEventListener("keydown", ouvir);
    return () => window.removeEventListener("keydown", ouvir);
  }, [aberta]);

  return (
    <Folha
      aberta={aberta}
      aoFechar={fecharLimpo}
      titulo="Registro fácil"
      alturaMaxima="calc(100dvh - 8px)"
      className="folha-registro-facil"
    >
      <div className="registro-facil">
        <div className="registro-facil-seletores">
          <select
            aria-label="Tipo de lançamento"
            value={tipo}
            onChange={(e) => {
              const t = e.target.value as "despesa" | "receita";
              if (t !== tipo) { setTipo(t); setSituacao(null); }
            }}
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <select
            aria-label="Situação"
            value={situacao ?? ""}
            aria-invalid={erro === "Escolha a situação do lançamento." || undefined}
            onChange={(e) => {
              setSituacao(e.target.value as Situacao);
              if (erro === "Escolha a situação do lançamento.") setErro(null);
            }}
          >
            <option value="" disabled>Situação</option>
            {situacoesDoTipo(tipo).map((s) => (
              <option key={s} value={s}>{ROTULO_SITUACAO[s]}</option>
            ))}
          </select>
        </div>

        <div className="registro-facil-valor">
          <p
            aria-live="polite"
            style={{
              fontWeight: 700,
              lineHeight: 1.1,
              color: valor > 0 ? "var(--color-text)" : "var(--mut)",
            }}
          >
            <Dinheiro>{moeda(valor)}</Dinheiro>
          </p>
        </div>

        <select
          aria-label="Conta ou banco (opcional)"
          value={contaId ?? ""}
          onChange={(e) => setContaId(e.target.value || null)}
          disabled={contas.length === 0}
        >
          <option value="">{contas.length ? "Conta ou banco (opcional)" : "Sem bancos cadastrados"}</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <div className="registro-facil-teclado" title="Digite pelo teclado. Enter salva, Backspace apaga.">
          {TECLAS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => teclar(t)}
              aria-label={t === "apagar" ? "Apagar último número" : t}
              className="grid place-items-center"
              style={{
                borderRadius: "var(--rs)",
                border: "1px solid var(--ln)",
                background: "transparent",
                color: "var(--color-text)",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {t === "apagar" ? (
                <Delete size={22} strokeWidth={1.5} aria-hidden />
              ) : (
                t
              )}
            </button>
          ))}
        </div>

        <div className="registro-facil-aviso">
          {erro ? <p role="alert">{erro}</p> : null}
        </div>

        <div className="registro-facil-acoes">
          <Botao
            onClick={completarDepois}
            carregando={salvando}
            aria-label="Salvar rápido e completar depois"
            title="Salvar e completar depois"
            style={{ height: 44, padding: "8px 6px", fontSize: 13, letterSpacing: ".03em" }}
          >
            Salvar rápido
          </Botao>
          <Botao
            variante="contorno"
            onClick={detalharAgora}
            disabled={salvando}
            aria-label="Adicionar detalhes agora"
            title="Adicionar detalhes agora"
            style={{ height: 44, padding: "8px 6px", fontSize: 13, letterSpacing: ".03em" }}
          >
            Detalhes
          </Botao>
        </div>
      </div>
    </Folha>
  );
}
