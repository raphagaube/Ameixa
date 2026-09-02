import "server-only";

import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";
import {
  marcarReconectar,
  obterCredenciais,
  type Credenciais,
} from "./credenciais";
import { planejar, type Vinculo } from "./decisao";
import { esperaDaTentativa, MAX_TENTATIVAS } from "./erros";
import { montarEvento, NOME_AGENDA, type Agenda } from "./evento";
import * as api from "./google";

/**
 * A ponte entre os lançamentos e o Google.
 *
 * Regra que vale para o arquivo inteiro: **nada aqui pode lançar**. Estas
 * funções são chamadas depois que o lançamento já foi salvo, e uma exceção
 * escapando daqui viraria erro numa tela onde o dado já está no banco. Falha
 * do Google vira item na fila e aviso em Ajustes, nunca "não deu para
 * salvar".
 */

const CAMPOS = `
  id, tipo, valor, descricao, data_registro, data_vencimento, situacao,
  categoria_id, subcategoria_id, conta_id, cartao_id, forma_pagamento,
  responsavel, observacao, meta_id, serie_id, serie_tipo, parcela_atual,
  parcela_total, incompleto,
  categoria:categorias(nome, cor, cor_texto),
  subcategoria:subcategorias(nome),
  conta:contas(nome),
  cartao:cartoes(nome)
`;

/** Acima disto, o trabalho vai para a fila em vez de segurar a requisição. */
export const LIMITE_NA_HORA = 5;

export type ResultadoSync = { feitos: number; adiados: number };

// ── Agendas ────────────────────────────────────────────────────────

/**
 * Garante que as duas agendas existem, procurando nesta ordem: id guardado,
 * depois nome, e só então cria. Casar pelo id primeiro é o que evita criar
 * uma segunda "Ameixa Contas a pagar" toda vez que o dono reconecta.
 */
export async function garantirAgendas(
  access: string,
  guardado: { pagar: string | null; receber: string | null },
): Promise<{ pagar: string; receber: string } | null> {
  let lista: api.Resposta<{
    items?: { id: string; summary?: string }[];
  }> | null = null;

  const acharUma = async (agenda: Agenda, id: string | null) => {
    if (id) {
      const r = await api.lerCalendario(access, id);
      if (r.ok) return r.dados.id;
      // 404 significa que sumiu do lado do Google. Qualquer outra coisa é
      // problema de rede, e criar uma agenda nova aí seria duplicar.
      if (r.reacao !== "agenda-sumiu") return null;
    }

    lista ??= await api.listarCalendarios(access);
    if (lista.ok) {
      const achou = lista.dados.items?.find(
        (c) => c.summary === NOME_AGENDA[agenda],
      );
      if (achou) return achou.id;
    }

    const nova = await api.criarCalendario(access, agenda);
    return nova.ok ? nova.dados.id : null;
  };

  const pagar = await acharUma("pagar", guardado.pagar);
  if (!pagar) return null;
  const receber = await acharUma("receber", guardado.receber);
  if (!receber) return null;

  return { pagar, receber };
}

// ── Sincronização ──────────────────────────────────────────────────

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

async function carregar(supabase: Cliente, ids: string[]) {
  const [lancRes, vincRes] = await Promise.all([
    supabase.from("lancamentos").select(CAMPOS).in("id", ids),
    supabase
      .from("eventos_agenda")
      .select("lancamento_id, calendario_id, evento_id, assinatura")
      .in("lancamento_id", ids),
  ]);

  const um = <T,>(v: unknown): T | null =>
    Array.isArray(v) ? ((v[0] as T) ?? null) : ((v as T) ?? null);

  const lancamentos = new Map<string, LancamentoNaLista>();
  for (const bruto of (lancRes.data ?? []) as Record<string, unknown>[]) {
    lancamentos.set(bruto.id as string, {
      ...(bruto as unknown as LancamentoNaLista),
      valor: Number(bruto.valor),
      categoria: um(bruto.categoria),
      subcategoria: um(bruto.subcategoria),
      conta: um(bruto.conta),
      cartao: um(bruto.cartao),
    });
  }

  const vinculos = new Map<string, Vinculo>();
  for (const v of vincRes.data ?? []) {
    vinculos.set(v.lancamento_id, {
      calendario_id: v.calendario_id,
      evento_id: v.evento_id,
      assinatura: v.assinatura,
    });
  }

  return { lancamentos, vinculos };
}

async function reagir(reacao: string): Promise<boolean> {
  if (reacao === "reconectar") await marcarReconectar("google-recusou");
  return false;
}

/**
 * Executa o plano de um lançamento. Devolve `true` quando terminou e
 * `false` quando vale tentar de novo mais tarde.
 */
async function aplicar(
  supabase: Cliente,
  cred: Credenciais,
  userId: string,
  id: string,
  lancamento: LancamentoNaLista | null,
  vinculo: Vinculo | null,
): Promise<boolean> {
  const plano = planejar(lancamento, vinculo, cred.agendaId);

  const guardar = (calendario: string, evento: string, assinatura: string) =>
    supabase.from("eventos_agenda").upsert(
      {
        lancamento_id: id,
        user_id: userId,
        calendario_id: calendario,
        evento_id: evento,
        assinatura,
        sincronizado_em: new Date().toISOString(),
      },
      { onConflict: "lancamento_id" },
    );

  const esquecer = () =>
    supabase.from("eventos_agenda").delete().eq("lancamento_id", id);

  switch (plano.acao) {
    case "nada":
      return true;

    case "criar": {
      const calendario = cred.agendaId(plano.agenda);
      if (!calendario) return false;
      const r = await api.criarEvento(
        cred.access,
        calendario,
        montarEvento(lancamento!),
      );
      if (!r.ok) return reagir(r.reacao);
      await guardar(calendario, r.dados.id, plano.assinatura);
      return true;
    }

    case "atualizar": {
      const r = await api.atualizarEvento(
        cred.access,
        vinculo!.calendario_id,
        plano.evento_id,
        montarEvento(lancamento!),
      );
      if (r.ok) {
        await guardar(vinculo!.calendario_id, plano.evento_id, plano.assinatura);
        return true;
      }
      // O dono apagou o evento na mão. Esquece o vínculo; se ainda for
      // pendência, a próxima passada cria de novo.
      if (r.reacao === "evento-sumiu") {
        await esquecer();
        return false;
      }
      return reagir(r.reacao);
    }

    case "mover": {
      const destino = cred.agendaId(plano.agenda)!;
      const m = await api.moverEvento(
        cred.access,
        vinculo!.calendario_id,
        plano.evento_id,
        destino,
      );
      if (!m.ok) {
        if (m.reacao === "evento-sumiu") {
          await esquecer();
          return false;
        }
        return reagir(m.reacao);
      }
      const r = await api.atualizarEvento(
        cred.access,
        destino,
        plano.evento_id,
        montarEvento(lancamento!),
      );
      if (!r.ok) return reagir(r.reacao);
      await guardar(destino, plano.evento_id, plano.assinatura);
      return true;
    }

    case "apagar": {
      const r = await api.apagarEvento(
        cred.access,
        plano.calendario_id,
        plano.evento_id,
      );
      // Já não estava lá: é o fim desejado, alcançado por outro caminho.
      if (r.ok || r.reacao === "evento-sumiu") {
        await esquecer();
        return true;
      }
      return reagir(r.reacao);
    }
  }
}

/**
 * Sincroniza os lançamentos indicados. Nunca lança; o pior desfecho é
 * devolver tudo como adiado.
 */
export async function sincronizarLancamentos(
  ids: string[],
): Promise<ResultadoSync> {
  if (ids.length === 0) return { feitos: 0, adiados: 0 };

  try {
    const cred = await obterCredenciais();
    if (typeof cred === "string") {
      // Só vale enfileirar quando a conexão existe e falhou. Sem conexão
      // configurada, é a carga inicial que pega tudo depois.
      if (cred === "indisponivel") await enfileirar(ids, "salvar");
      return { feitos: 0, adiados: ids.length };
    }

    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { feitos: 0, adiados: ids.length };

    const { lancamentos, vinculos } = await carregar(supabase, ids);

    let feitos = 0;
    const adiar: string[] = [];

    // Em série, de propósito: rajada de requisições simultâneas rende
    // `rateLimitExceeded`, e ninguém está esperando por isto de qualquer
    // forma — a resposta da tela já foi.
    for (const id of ids) {
      const ok = await aplicar(
        supabase,
        cred,
        user.id,
        id,
        lancamentos.get(id) ?? null,
        vinculos.get(id) ?? null,
      );
      if (ok) feitos += 1;
      else adiar.push(id);
    }

    if (adiar.length) await enfileirar(adiar, "salvar");
    return { feitos, adiados: adiar.length };
  } catch {
    // Última rede de proteção. O lançamento já está salvo, e nenhuma falha
    // daqui pode chegar à tela do dono como erro de salvamento.
    return { feitos: 0, adiados: ids.length };
  }
}

/**
 * Apaga o evento de um lançamento que já saiu do banco.
 *
 * Recebe os dados do vínculo por parâmetro porque o `on delete cascade` já
 * levou a linha embora — daí a leitura ter que acontecer ANTES do delete.
 */
export async function apagarEventoOrfao(v: {
  calendario_id: string;
  evento_id: string;
}): Promise<boolean> {
  try {
    const cred = await obterCredenciais();
    if (typeof cred === "string") {
      await enfileirarApagar(v);
      return false;
    }
    const r = await api.apagarEvento(cred.access, v.calendario_id, v.evento_id);
    if (r.ok || r.reacao === "evento-sumiu") return true;
    if (r.reacao === "reconectar") await marcarReconectar("google-recusou");
    await enfileirarApagar(v);
    return false;
  } catch {
    return false;
  }
}

// ── Fila ───────────────────────────────────────────────────────────

export async function enfileirar(ids: string[], acao: "salvar" | "apagar") {
  if (ids.length === 0) return;
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("fila_agenda")
      .insert(ids.map((lancamento_id) => ({ user_id: user.id, lancamento_id, acao })));
  } catch {
    // Nem a fila pode derrubar o salvamento. O que se perde aqui, a carga
    // inicial recupera depois.
  }
}

async function enfileirarApagar(carga: {
  calendario_id: string;
  evento_id: string;
}) {
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("fila_agenda")
      .insert({ user_id: user.id, acao: "apagar", carga });
  } catch {
    /* idem */
  }
}

/**
 * Tira da fila o que já pode ser tentado. Chamada no fim de outras ações e
 * ao abrir os Ajustes — não há cron: no plano Hobby da Vercel ele roda uma
 * vez por dia, o que não resolveria nada.
 */
export async function drenarFila(limite = 20): Promise<ResultadoSync> {
  try {
    const supabase = await criarClienteServidor();
    const { data } = await supabase
      .from("fila_agenda")
      .select("id, lancamento_id, acao, carga, tentativas")
      .lte("proxima_tentativa", new Date().toISOString())
      .order("proxima_tentativa")
      .limit(limite);

    if (!data?.length) return { feitos: 0, adiados: 0 };

    const paraSalvar = data.filter((f) => f.acao === "salvar" && f.lancamento_id);
    const paraApagar = data.filter((f) => f.acao === "apagar" && f.carga);

    let feitos = 0;
    const resolvidos: number[] = [];
    const falhos: typeof data = [];

    for (const f of paraApagar) {
      const c = f.carga as { calendario_id: string; evento_id: string };
      if (await apagarEventoOrfao(c)) {
        resolvidos.push(f.id);
        feitos += 1;
      } else {
        falhos.push(f);
      }
    }

    if (paraSalvar.length) {
      // Tira da fila antes de tentar: `sincronizarLancamentos` reenfileira
      // o que falhar, e sem isso a linha se multiplicaria a cada passada.
      await supabase
        .from("fila_agenda")
        .delete()
        .in(
          "id",
          paraSalvar.map((f) => f.id),
        );
      const r = await sincronizarLancamentos(
        paraSalvar.map((f) => f.lancamento_id as string),
      );
      feitos += r.feitos;
    }

    if (resolvidos.length) {
      await supabase.from("fila_agenda").delete().in("id", resolvidos);
    }

    for (const f of falhos) {
      const t = (f.tentativas ?? 0) + 1;
      if (t >= MAX_TENTATIVAS) {
        // Quatro tentativas e nada. Insistir para sempre só esconde o
        // problema; o aviso em Ajustes é o que o dono precisa ver.
        await supabase.from("fila_agenda").delete().eq("id", f.id);
      } else {
        await supabase
          .from("fila_agenda")
          .update({
            tentativas: t,
            proxima_tentativa: new Date(
              Date.now() + esperaDaTentativa(t),
            ).toISOString(),
          })
          .eq("id", f.id);
      }
    }

    return { feitos, adiados: falhos.length };
  } catch {
    return { feitos: 0, adiados: 0 };
  }
}
