"use client";

import { CalendarPlus, RefreshCw, TriangleAlert, Unlink } from "lucide-react";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import type { StatusAgenda } from "@/lib/dados/agenda";
import {
  desconectarAgenda,
  sincronizarPendencias,
  tentarFilaAgora,
} from "./agenda";

/**
 * Conexão com o Google Agenda.
 *
 * Contas a pagar e a receber viram compromissos com lembrete um dia antes.
 * A tela precisa deixar três coisas óbvias: o que vai acontecer antes de
 * conectar, o que já foi sincronizado, e — o mais importante — quando a
 * conexão caiu.
 */
export function AgendaGoogle({ status }: { status: StatusAgenda }) {
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  if (!status.configurado) {
    return (
      <div className="flex flex-col" style={{ gap: 8 }}>
        <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
          A conexão com o Google Agenda ainda não foi configurada neste app.
        </p>
        {status.faltando.length > 0 ? (
          <div
            style={{
              padding: 12,
              borderRadius: "var(--rs)",
              border: "1px solid var(--ln)",
            }}
          >
            <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 6 }}>
              {status.faltando.length === 1
                ? "Falta esta variável na Vercel, e um novo deploy depois:"
                : `Faltam ${status.faltando.length} variáveis na Vercel, e um novo deploy depois:`}
            </p>
            <ul className="flex flex-col" style={{ gap: 4 }}>
              {status.faltando.map((nome) => (
                <li
                  key={nome}
                  style={{
                    fontSize: 12,
                    fontFamily: "ui-monospace, monospace",
                    color: "var(--color-text)",
                  }}
                >
                  {nome}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  /**
   * Chama em laço até acabar. O servidor manda um lote por vez para não
   * esbarrar no tempo máximo da função; quem conta o progresso é aqui.
   */
  function enviarPendencias() {
    setErro(null);
    iniciar(async () => {
      let enviados = 0;
      for (let volta = 0; volta < 60; volta += 1) {
        const r = await sincronizarPendencias();
        if (!r.ok) {
          setErro(r.erro);
          setProgresso(null);
          return;
        }
        enviados += r.enviados;
        setProgresso(
          r.restantes > 0
            ? `Enviei ${enviados} de ${enviados + r.restantes}…`
            : `Pronto: ${enviados} compromissos na sua agenda.`,
        );
        // Nada foi enviado e ainda sobra: insistir só repetiria a falha.
        if (r.restantes === 0 || r.enviados === 0) break;
      }
    });
  }

  function tentarFila() {
    setErro(null);
    iniciar(async () => {
      const r = await tentarFilaAgora();
      if (r.ok) {
        setProgresso(
          r.restantes > 0
            ? `Enviei ${r.enviados}; ${r.restantes} continuam esperando.`
            : `Enviei ${r.enviados}. Nada mais na espera.`,
        );
      }
    });
  }

  function desconectar() {
    if (
      !window.confirm(
        "Desconectar o Google Agenda?\n\nAs duas agendas e os compromissos continuam no Google — você pode apagá-las por lá se quiser. Novos lançamentos deixam de virar compromisso.",
      )
    ) {
      return;
    }
    setErro(null);
    setProgresso(null);
    iniciar(async () => {
      const r = await desconectarAgenda();
      if (!r.ok) setErro(r.erro);
    });
  }

  if (!status.conectado) {
    return (
      <div className="flex flex-col" style={{ gap: 10 }}>
        <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
          Suas contas a pagar e a receber viram compromissos no Google Agenda,
          com lembrete às 9h do dia anterior. A Ameixa cria duas agendas
          separadas e não enxerga o resto do seu calendário.
        </p>
        <Botao variante="contorno" href="/api/agenda/conectar">
          <span className="flex items-center justify-center" style={{ gap: 8 }}>
            <CalendarPlus size={18} strokeWidth={1.5} aria-hidden />
            Conectar o Google Agenda
          </span>
        </Botao>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {status.precisaReconectar ? (
        <div
          role="alert"
          className="flex flex-col"
          style={{
            gap: 8,
            padding: 12,
            borderRadius: "var(--rs)",
            border: "1px solid var(--bad)",
          }}
        >
          <p
            className="flex items-center"
            style={{ gap: 8, fontSize: 14, fontWeight: 600, color: "var(--bad)" }}
          >
            <TriangleAlert size={18} strokeWidth={1.5} aria-hidden />
            A conexão com o Google expirou
          </p>
          <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
            Seus lançamentos continuam salvos. Só os compromissos pararam de ser
            criados.
          </p>
          <Botao variante="contorno" href="/api/agenda/conectar">
            Reconectar
          </Botao>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
          Conectado{status.email ? ` como ${status.email}` : ""} ·{" "}
          {status.sincronizados} compromisso
          {status.sincronizados === 1 ? "" : "s"} na sua agenda.
        </p>
      )}

      {status.pendentesSemEvento > 0 && !status.precisaReconectar ? (
        <Botao variante="contorno" onClick={enviarPendencias} carregando={ocupado}>
          <span className="flex items-center justify-center" style={{ gap: 8 }}>
            <RefreshCw size={18} strokeWidth={1.5} aria-hidden />
            Enviar as {status.pendentesSemEvento} pendências que já existem
          </span>
        </Botao>
      ) : null}

      {status.naFila > 0 ? (
        <div className="flex flex-col" style={{ gap: 6 }}>
          <p style={{ fontSize: 13, color: "var(--mut)" }}>
            {status.naFila} compromisso{status.naFila === 1 ? "" : "s"} aguardando
            envio.
          </p>
          <Botao variante="texto" onClick={tentarFila} carregando={ocupado}>
            Tentar agora
          </Botao>
        </div>
      ) : null}

      {progresso ? (
        <p aria-live="polite" style={{ fontSize: 13, color: "var(--mut)" }}>
          {progresso}
        </p>
      ) : null}

      {erro ? (
        <p role="alert" style={{ fontSize: 12, color: "var(--bad)" }}>
          {erro}
        </p>
      ) : null}

      <Botao variante="texto" onClick={desconectar} carregando={ocupado}>
        <span className="flex items-center justify-center" style={{ gap: 8 }}>
          <Unlink size={16} strokeWidth={1.5} aria-hidden />
          Desconectar
        </span>
      </Botao>
    </div>
  );
}
