import { CircleAlert, PartyPopper } from "lucide-react";
import Link from "next/link";
import { AlternarTema } from "@/components/alternar-tema";
import { LinhaLancamento } from "@/components/linha-lancamento";
import { MetaDestaque } from "@/components/meta-destaque";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { SeletorMes } from "@/components/seletor-mes";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { ultimosLancamentos } from "@/lib/dados/lancamentos";
import { metasDoUsuario } from "@/lib/dados/metas";
import { orcamentosDoMes } from "@/lib/dados/orcamentos";
import { resumoDoMes } from "@/lib/dados/resumo-mes";
import {
  COR_ESTADO,
  estadoDoOrcamento,
  percentualDoOrcamento,
} from "@/lib/tipos/orcamentos";
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

  const [perfil, resumo, ultimos, metas, orcamentos] = await Promise.all([
    perfilDoUsuario(),
    resumoDoMes(ano, mes),
    ultimosLancamentos(4),
    metasDoUsuario(),
    orcamentosDoMes(ano, mes),
  ]);

  const primeiroNome = (perfil?.nome ?? "").split(" ")[0];
  // Sem meta marcada, mostra a primeira — melhor que um espaço vazio.
  const destaque =
    metas.find((m) => m.id === perfil?.meta_destaque) ?? metas[0] ?? null;
  const tresOrcamentos = orcamentos.slice(0, 3);

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

      {destaque ? <MetaDestaque meta={destaque} /> : null}

      {tresOrcamentos.length > 0 ? (
        <section className="flex flex-col" style={{ gap: 10 }}>
          <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
            <h2 style={{ fontSize: 17 }}>Orçamentos do mês</h2>
            <Link
              href="/orcamentos"
              style={{ fontSize: 13, color: "var(--deep)", fontWeight: 600 }}
            >
              ver todos
            </Link>
          </div>
          <ul className="flex flex-col" style={{ gap: 10 }}>
            {tresOrcamentos.map((o) => {
              const estado = estadoDoOrcamento(o.gasto, o.limite);
              const pct = percentualDoOrcamento(o.gasto, o.limite);
              return (
                <li key={o.id}>
                  <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{o.categoria}</span>
                    <span
                      style={{ fontSize: 12, fontWeight: 600, color: COR_ESTADO[estado] }}
                    >
                      {moeda(o.gasto)} de {moeda(o.limite)}
                    </span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <BarraProgresso
                      percentual={pct}
                      altura={6}
                      cor={COR_ESTADO[estado]}
                      rotulo={`Orçamento de ${o.categoria}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col" style={{ gap: 4 }}>
        <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 17 }}>Últimos lançamentos</h2>
          <Link href="/extrato" style={{ fontSize: 13, color: "var(--deep)", fontWeight: 600 }}>
            ver tudo
          </Link>
        </div>

        {ultimos.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--mut)", paddingTop: 8 }}>
            Nada lançado ainda. Toque em Registro Fácil para começar.
          </p>
        ) : (
          ultimos.map((l) => <LinhaLancamento key={l.id} l={l} mostrarData />)
        )}
      </section>
    </div>
  );
}
