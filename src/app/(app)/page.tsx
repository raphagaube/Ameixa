import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { AlternarTema } from "@/components/alternar-tema";
import { mesAno, moeda } from "@/lib/formato";

/**
 * Início. Ainda sem banco ligado — os números abaixo são zerados de propósito,
 * porque o app foi entregue vazio. As telas ganham dados na etapa de auth.
 */
export default function Inicio() {
  const agora = new Date();
  const saldo = 0;
  const receitas = 0;
  const despesas = 0;

  return (
    <div className="flex flex-col" style={{ gap: 16, paddingTop: 22 }}>
      <header className="flex items-start justify-between" style={{ gap: 12 }}>
        <div>
          <p className="rotulo">Meu painel</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, marginTop: 4 }}>
            Olá
          </h1>
        </div>
        <AlternarTema />
      </header>

      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "44px 1fr 44px", gap: 8 }}
      >
        <button
          type="button"
          aria-label="Mês anterior"
          className="grid place-items-center rounded-xl border"
          style={{ height: 44, borderColor: "var(--ln)", color: "var(--color-text)" }}
        >
          <ChevronLeft size={18} strokeWidth={1.5} aria-hidden />
        </button>
        <button
          type="button"
          className="rounded-xl border"
          style={{
            height: 44,
            borderColor: "var(--ln)",
            color: "var(--color-text)",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {mesAno(agora)}
        </button>
        <button
          type="button"
          aria-label="Próximo mês"
          className="grid place-items-center rounded-xl border"
          style={{ height: 44, borderColor: "var(--ln)", color: "var(--color-text)" }}
        >
          <ChevronRight size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <section
        style={{
          background: "var(--tint)",
          borderRadius: "var(--r)",
          padding: "15px 14px",
        }}
      >
        <p className="rotulo">Saldo total · {mesAno(agora)}</p>
        <p style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1, marginTop: 6 }}>
          {moeda(saldo)}
        </p>
        <div className="grid grid-cols-2" style={{ gap: 12, marginTop: 12 }}>
          <div>
            <p className="rotulo">Receitas</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: "var(--ok)" }}>
              {moeda(receitas)}
            </p>
          </div>
          <div>
            <p className="rotulo">Despesas</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: "var(--bad)" }}>
              {moeda(despesas)}
            </p>
          </div>
        </div>
      </section>

      <section
        className="flex items-center"
        style={{
          gap: 10,
          background: "var(--tint)",
          border: "1px solid var(--deep)",
          borderRadius: "var(--r)",
          padding: "13px 14px",
        }}
      >
        <PartyPopper size={20} strokeWidth={1.5} style={{ color: "var(--deep)" }} aria-hidden />
        <p style={{ fontSize: 14 }}>Não há lançamentos pendentes! 🥳</p>
      </section>
    </div>
  );
}
