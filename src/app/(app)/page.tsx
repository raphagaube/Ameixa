import { CircleAlert, PartyPopper } from "lucide-react";
import Link from "next/link";
import { AlternarTema } from "@/components/alternar-tema";
import { SeletorMes } from "@/components/seletor-mes";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { resumoDoMes } from "@/lib/dados/resumo-mes";
import { mesAno, moeda } from "@/lib/formato";

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const p = await searchParams;
  const hoje = new Date();
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();
  const referencia = new Date(ano, mes, 1);

  const [perfil, resumo] = await Promise.all([
    perfilDoUsuario(),
    resumoDoMes(ano, mes),
  ]);

  const primeiroNome = (perfil?.nome ?? "").split(" ")[0];

  return (
    <div className="flex flex-col" style={{ gap: 16, paddingTop: 22 }}>
      <header className="flex items-start justify-between" style={{ gap: 12 }}>
        <div>
          <p className="rotulo">Meu painel</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, marginTop: 4 }}>
            Olá, {primeiroNome}
          </h1>
        </div>
        <AlternarTema />
      </header>

      <SeletorMes ano={ano} mes={mes} />

      <section
        style={{
          background: "var(--tint)",
          borderRadius: "var(--r)",
          padding: "15px 14px",
        }}
      >
        <p className="rotulo">Saldo total · {mesAno(referencia)}</p>
        <p style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1, marginTop: 6 }}>
          {moeda(resumo.saldo)}
        </p>
        <div className="grid grid-cols-2" style={{ gap: 12, marginTop: 12 }}>
          <div>
            <p className="rotulo">Receitas</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: "var(--ok)" }}>
              {moeda(resumo.receitas)}
            </p>
          </div>
          <div>
            <p className="rotulo">Despesas</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: "var(--bad)" }}>
              {moeda(resumo.despesas)}
            </p>
          </div>
        </div>
      </section>

      {resumo.pendentes > 0 ? (
        <Link
          href="/pendencias"
          className="flex items-center pulso-pendencia"
          style={{
            gap: 10,
            border: "1px solid var(--bad)",
            borderRadius: "var(--r)",
            padding: "13px 14px",
            color: "var(--color-text)",
          }}
        >
          <CircleAlert
            size={20}
            strokeWidth={1.5}
            style={{ color: "var(--bad)", flexShrink: 0 }}
            aria-hidden
          />
          <span style={{ fontSize: 14 }}>
            {resumo.pendentes === 1
              ? "1 lançamento esperando você completar"
              : `${resumo.pendentes} lançamentos esperando você completar`}
          </span>
        </Link>
      ) : (
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
          <PartyPopper
            size={20}
            strokeWidth={1.5}
            style={{ color: "var(--deep)", flexShrink: 0 }}
            aria-hidden
          />
          <p style={{ fontSize: 14 }}>Não há lançamentos pendentes! 🥳</p>
        </section>
      )}
    </div>
  );
}
