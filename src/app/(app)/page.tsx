import { AvisoPendencias } from "@/components/aviso-pendencias";
import Link from "next/link";
import { AlternarTema } from "@/components/alternar-tema";
import { LinhaLancamento } from "@/components/linha-lancamento";
import { MetaDestaque } from "@/components/meta-destaque";
import { OndeEstaMeuDinheiro } from "@/components/onde-esta-meu-dinheiro";
import { BarraProgresso } from "@/components/ui/barra-progresso";
import { SeletorMes } from "@/components/seletor-mes";
import { perfilDoUsuario } from "@/lib/dados/perfil";
import { ultimosLancamentos } from "@/lib/dados/lancamentos";
import { resumoDasPendencias } from "@/lib/dados/pendencias";
import { metasDoUsuario } from "@/lib/dados/metas";
import { orcamentosDoMes } from "@/lib/dados/orcamentos";
import { panoramaDasContas } from "@/lib/dados/saldos";
import { resumoDoMes } from "@/lib/dados/resumo-mes";
import {
  COR_ESTADO,
  estadoDoOrcamento,
  percentualDoOrcamento,
} from "@/lib/tipos/orcamentos";
import { hojeEmBrasilia, moeda } from "@/lib/formato";
import { Dinheiro } from "@/components/dinheiro";
import { BotaoPrivacidade } from "@/components/botao-privacidade";

/** Quebra tipográfica opcional, sem alterar o valor nem o modo privado. */
function DinheiroResumo({ valor }: { valor: number }) {
  const texto = moeda(valor);
  const corte = texto.indexOf("\u00a0") + 1;
  return <Dinheiro>{texto.slice(0, corte)}<wbr className="tip-quebra-moeda" />{texto.slice(corte)}</Dinheiro>;
}

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const p = await searchParams;
  const hoje = hojeEmBrasilia();
  const ano = Number(p.ano) || hoje.getFullYear();
  const mes = p.mes !== undefined ? Number(p.mes) : hoje.getMonth();

  const [perfil, resumo, ultimos, metas, orcamentos, panorama, pendencias] =
    await Promise.all([
      perfilDoUsuario(),
      resumoDoMes(ano, mes),
      ultimosLancamentos(4),
      metasDoUsuario(),
      orcamentosDoMes(ano, mes),
      panoramaDasContas(),
      // Global, não do mês: é a mesma conta que a tela de Pendências faz.
      resumoDasPendencias(),
    ]);

  const primeiroNome = (perfil?.nome ?? "").split(" ")[0];
  // Sem meta marcada, mostra a primeira — melhor que um espaço vazio.
  const destaque =
    metas.find((m) => m.id === perfil?.meta_destaque) ?? metas[0] ?? null;
  const tresOrcamentos = orcamentos.slice(0, 3);

  return (
    <div className="espaco-inicio tipografia-financeira inicio-tipografia flex flex-col" style={{ gap: 16, paddingTop: 22 }}>
      <header className="flex items-start justify-between" style={{ gap: 12 }}>
        <div>
          <p className="rotulo">Meu painel</p>
          <h1 className="tip-titulo" style={{ fontSize: 30, lineHeight: 1.15, marginTop: 4 }}>
            Olá, {primeiroNome}
          </h1>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <BotaoPrivacidade />
          <AlternarTema />
        </div>
      </header>

      <SeletorMes ano={ano} mes={mes} />

      {/* No celular, uma coluna só; no notebook, duas. Ver .inicio-grade. */}
      <div className="inicio-grade">
        <div className="inicio-coluna">
          <section className="espaco-card espaco-resumo"
            style={{
              background: "var(--tint)",
              borderRadius: "var(--r)",
              padding: "15px 14px",
            }}
          >
            <p className="rotulo">Disponível hoje</p>
            <p className="tip-principal"
              style={{
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1.1,
                marginTop: 6,
                color: panorama.disponivel < 0 ? "var(--bad)" : undefined,
              }}
            >
              <Dinheiro>{moeda(panorama.disponivel)}</Dinheiro>
            </p>
            <p className="tip-detalhe" style={{ fontSize: 12, color: "var(--mut)" }}>
              contas correntes e dinheiro
            </p>

            <div className="tip-resumo-mes grid grid-cols-3" style={{ gap: 10, marginTop: 14 }}>
              <div>
                <p className="rotulo">Receitas</p>
                <p style={{ fontSize: 17, fontWeight: 600, color: "var(--ok)" }}>
                  <DinheiroResumo valor={resumo.receitas} />
                </p>
              </div>
              <div>
                <p className="rotulo">Despesas</p>
                <p style={{ fontSize: 17, fontWeight: 600, color: "var(--bad)" }}>
                  <DinheiroResumo valor={resumo.despesas} />
                </p>
              </div>
              <div>
                <p className="rotulo">No mês</p>
                <p
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: resumo.resultado < 0 ? "var(--bad)" : "var(--ok)",
                  }}
                >
                  {resumo.resultado > 0 ? "+" : ""}
                  <DinheiroResumo valor={resumo.resultado} />
                </p>
              </div>
            </div>
          </section>

          <OndeEstaMeuDinheiro panorama={panorama} />

          <AvisoPendencias quantidade={pendencias.quantidade} semConta={pendencias.semConta} />
        </div>

        <div className="inicio-coluna">
          {destaque ? <MetaDestaque meta={destaque} /> : null}

          {tresOrcamentos.length > 0 ? (
            <section className="espaco-secao espaco-orcamentos flex flex-col" style={{ gap: 10 }}>
              <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
                <h2 style={{ fontSize: 17 }}>Orçamentos do mês</h2>
                <Link
                  href="/orcamentos"
                  style={{ fontSize: 13, color: "var(--deep)", fontWeight: 600 }}
                >
                  ver todos
                </Link>
              </div>
              <ul className="espaco-lista-orcamentos flex flex-col" style={{ gap: 10 }}>
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
                          <Dinheiro>{moeda(o.gasto)}</Dinheiro> de <Dinheiro>{moeda(o.limite)}</Dinheiro>
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

          <section className="espaco-ultimos flex flex-col" style={{ gap: 4 }}>
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
              <div className="espaco-lista-ultimos">{ultimos.map((l) => <LinhaLancamento key={l.id} l={l} mostrarData />)}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
