"use client";

import { Delete } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Folha } from "@/components/ui/folha";
import { Segmentos } from "@/components/ui/segmentos";
import { moeda } from "@/lib/formato";
import type { Conta } from "@/lib/tipos/contas";
import { salvarRapido } from "@/app/(app)/lancamentos/acoes";

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
  aoDetalhar: (valor: number, tipo: "despesa" | "receita", contaId: string | null) => void;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [digitos, setDigitos] = useState("");
  const [contaId, setContaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const valor = paraNumero(digitos);
  const primeiras = contas.slice(0, 4);

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
    setErro(null);
    aoFechar();
  }

  function completarDepois() {
    setErro(null);
    if (valor <= 0) {
      setErro("Digite um valor primeiro.");
      return;
    }
    iniciar(async () => {
      const r = await salvarRapido(valor, tipo, contaId);
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
    if (valor <= 0) {
      setErro("Digite um valor primeiro.");
      return;
    }
    const v = valor;
    const t = tipo;
    const c = contaId;
    setDigitos("");
    aoDetalhar(v, t, c);
  }

  return (
    <Folha aberta={aberta} aoFechar={fecharLimpo} titulo="Registro fácil">
      <div className="flex flex-col" style={{ gap: 14, paddingBottom: 8 }}>
        <Segmentos
          opcoes={[
            { valor: "despesa" as const, texto: "Despesa" },
            { valor: "receita" as const, texto: "Receita" },
          ]}
          valor={tipo}
          aoEscolher={setTipo}
        />

        <div
          style={{
            background: "var(--tint)",
            borderRadius: "var(--r)",
            padding: "18px 14px",
            textAlign: "center",
          }}
        >
          <p
            aria-live="polite"
            style={{
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.1,
              color: valor > 0 ? "var(--color-text)" : "var(--mut)",
            }}
          >
            {moeda(valor)}
          </p>
        </div>

        {primeiras.length > 0 ? (
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {primeiras.map((c) => {
              const ativa = contaId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setContaId(ativa ? null : c.id)}
                  aria-pressed={ativa}
                  style={{
                    minHeight: 36,
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: ativa ? 700 : 500,
                    background: ativa ? c.cor : "transparent",
                    color: ativa ? "#ffffff" : "var(--color-text)",
                    border: `1px solid ${ativa ? c.cor : "var(--ln)"}`,
                  }}
                >
                  {c.nome}
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--mut)" }}>
            Cadastre um banco em Ajustes para escolher a conta aqui.
          </p>
        )}

        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {TECLAS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => teclar(t)}
              aria-label={t === "apagar" ? "Apagar último número" : t}
              className="grid place-items-center"
              style={{
                height: 56,
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

        <Botao onClick={completarDepois} carregando={salvando}>
          Salvar e completar depois
        </Botao>
        <Botao variante="contorno" onClick={detalharAgora} disabled={salvando}>
          Adicionar detalhes agora
        </Botao>
      </div>
    </Folha>
  );
}
