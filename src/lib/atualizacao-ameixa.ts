import type { LinhaCru } from "@/lib/csv";
import {
  analisarLinhas,
  casarCategoria,
  casarPorNome,
  palpitarMapeamento,
} from "@/lib/importacao";
import type { PlanilhaDoAmeixa } from "@/lib/planilha-ameixa-leitura";
import type { Situacao, TipoLancamento } from "@/lib/tipos/lancamentos";

/**
 * O que muda no app quando a planilha do Ameixa volta editada.
 *
 * Função pura: recebe a planilha e o estado atual do app e devolve o plano —
 * nomes que mudam, lançamentos que mudam (e em quais campos), linhas novas e
 * problemas. Quem grava é a ação do servidor, que recalcula o plano com o
 * banco na mão antes de aplicar.
 */

export type LancamentoAtual = {
  id: string;
  tipo: TipoLancamento;
  valor: number;
  descricao: string;
  data_registro: string;
  data_vencimento: string | null;
  situacao: Situacao;
  categoria_id: string | null;
  subcategoria_id: string | null;
  conta_id: string | null;
  forma_pagamento: string | null;
  responsavel: string | null;
  observacao: string | null;
};

export type AppAtual = {
  categorias: {
    id: string;
    nome: string;
    tipo: "despesa" | "receita";
    subcategorias: { id: string; nome: string }[];
  }[];
  contas: { id: string; nome: string }[];
  lancamentos: Map<string, LancamentoAtual>;
};

/** Os campos que a planilha pode alterar num lançamento. */
export type CamposGravaveis = {
  tipo: "despesa" | "receita";
  valor: number;
  descricao: string;
  data_registro: string;
  data_vencimento: string | null;
  situacao: Situacao;
  categoria_id: string | null;
  subcategoria_id: string | null;
  conta_id: string | null;
  forma_pagamento: string | null;
  responsavel: string | null;
  observacao: string | null;
};

export type Renome = {
  alvo: "categoria" | "subcategoria" | "conta";
  id: string;
  de: string;
  para: string;
};

export type Mudanca = {
  id: string;
  linha: number;
  descricao: string;
  campos: string[];
  novos: CamposGravaveis;
};

export type Problema = {
  aba: "Lançamentos" | "Categorias" | "Contas";
  linha: number;
  motivo: string;
};

export type PlanoAtualizacao = {
  renomes: Renome[];
  mudancas: Mudanca[];
  novas: LinhaCru[];
  problemas: Problema[];
  semMudanca: number;
};

/** O mesmo teto do formulário de categoria. */
const LIMITE_NOME = 40;

const texto = (v: string | null | undefined) => (v ?? "").trim();
const ouNulo = (v: string | null | undefined) => texto(v) || null;

export function planejarAtualizacao(
  planilha: PlanilhaDoAmeixa,
  app: AppAtual,
): PlanoAtualizacao {
  const problemas: Problema[] = [];

  // ── Nomes ────────────────────────────────────────────────────────
  const nomeCat = new Map(app.categorias.map((c) => [c.id, c.nome]));
  const nomeSub = new Map<string, string>();
  const catDaSub = new Map<string, string>();
  for (const c of app.categorias) {
    for (const s of c.subcategorias) {
      nomeSub.set(s.id, s.nome);
      catDaSub.set(s.id, c.id);
    }
  }
  const nomeConta = new Map(app.contas.map((c) => [c.id, c.nome]));

  const candidatos: (Renome & { aba: Problema["aba"]; linha: number })[] = [];

  const propor = (
    alvo: Renome["alvo"],
    aba: Problema["aba"],
    linha: number,
    id: string,
    de: string,
    para: string,
    rotulo: string,
  ) => {
    if (!para) {
      problemas.push({ aba, linha, motivo: `${rotulo} "${de}" ficou sem nome — o nome não mudou.` });
    } else if (para.length > LIMITE_NOME) {
      problemas.push({
        aba,
        linha,
        motivo: `O nome novo de ${rotulo.toLowerCase()} "${de}" passa de ${LIMITE_NOME} letras — o nome não mudou.`,
      });
    } else if (para !== de) {
      candidatos.push({ alvo, aba, linha, id, de, para });
    }
  };

  for (const r of planilha.categorias) {
    if (nomeCat.has(r.codigo)) {
      propor("categoria", "Categorias", r.linha, r.codigo, nomeCat.get(r.codigo)!, r.categoria, "A categoria");
    } else if (nomeSub.has(r.codigo)) {
      propor("subcategoria", "Categorias", r.linha, r.codigo, nomeSub.get(r.codigo)!, r.subcategoria, "A subcategoria");
    } else {
      problemas.push({
        aba: "Categorias",
        linha: r.linha,
        motivo: `O código ${r.codigo} não é de nenhuma categoria do app — a linha foi ignorada.`,
      });
    }
  }
  for (const r of planilha.contas) {
    if (nomeConta.has(r.codigo)) {
      propor("conta", "Contas", r.linha, r.codigo, nomeConta.get(r.codigo)!, r.nome, "A conta");
    } else {
      problemas.push({
        aba: "Contas",
        linha: r.linha,
        motivo: `O código ${r.codigo} não é de nenhuma conta do app — a linha foi ignorada.`,
      });
    }
  }

  // O banco não aceita dois nomes iguais (categorias e contas por usuário,
  // subcategorias por categoria). Descobrir aqui evita parar no meio.
  const finalCat = new Map(nomeCat);
  const finalSub = new Map(nomeSub);
  const finalConta = new Map(nomeConta);
  for (const c of candidatos) {
    if (c.alvo === "categoria") finalCat.set(c.id, c.para);
    else if (c.alvo === "subcategoria") finalSub.set(c.id, c.para);
    else finalConta.set(c.id, c.para);
  }

  const emConflito = new Set<string>();
  const acharRepetidos = (nomes: Map<string, string>, grupo: (id: string) => string) => {
    const vistos = new Map<string, string[]>();
    for (const [id, nome] of nomes) {
      const chave = `${grupo(id)}|${nome}`;
      vistos.set(chave, [...(vistos.get(chave) ?? []), id]);
    }
    for (const ids of vistos.values()) if (ids.length > 1) ids.forEach((id) => emConflito.add(id));
  };
  acharRepetidos(finalCat, () => "");
  acharRepetidos(finalSub, (id) => catDaSub.get(id) ?? "");
  acharRepetidos(finalConta, () => "");

  const renomes: Renome[] = [];
  for (const c of candidatos) {
    if (emConflito.has(c.id)) {
      problemas.push({
        aba: c.aba,
        linha: c.linha,
        motivo: `"${c.de}" não pode virar "${c.para}": já existe outro item com esse nome — o nome não mudou.`,
      });
      if (c.alvo === "categoria") finalCat.set(c.id, c.de);
      else if (c.alvo === "subcategoria") finalSub.set(c.id, c.de);
      else finalConta.set(c.id, c.de);
    } else {
      renomes.push({ alvo: c.alvo, id: c.id, de: c.de, para: c.para });
    }
  }

  // Um lançamento pode citar a categoria pelo nome novo ou pelo antigo —
  // renomear só na aba Categorias não pode transformar mil linhas em erro.
  const catsParaCasar = [
    ...app.categorias.map((c) => ({ id: c.id, nome: finalCat.get(c.id)!, tipo: c.tipo })),
    ...app.categorias.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo })),
  ];
  const subsParaCasar = (categoriaId: string) => {
    const c = app.categorias.find((x) => x.id === categoriaId);
    if (!c) return [];
    return [
      ...c.subcategorias.map((s) => ({ id: s.id, nome: finalSub.get(s.id)! })),
      ...c.subcategorias.map((s) => ({ id: s.id, nome: s.nome })),
    ];
  };
  const contasParaCasar = [
    ...app.contas.map((c) => ({ id: c.id, nome: finalConta.get(c.id)! })),
    ...app.contas,
  ];

  // ── Lançamentos ──────────────────────────────────────────────────
  const mapa = palpitarMapeamento(Object.keys(planilha.lancamentos[0]?.cru ?? {}));
  const novas: LinhaCru[] = [];
  const mudancas: Mudanca[] = [];
  const vistos = new Set<string>();
  let semMudanca = 0;

  for (const l of planilha.lancamentos) {
    if (!l.codigo) {
      novas.push(l.cru);
      continue;
    }

    const atual = app.lancamentos.get(l.codigo);
    if (!atual || atual.tipo === "aporte") {
      problemas.push({
        aba: "Lançamentos",
        linha: l.linha,
        motivo: "O código não é de nenhum lançamento do app (pode ter sido excluído) — a linha foi ignorada.",
      });
      continue;
    }
    if (vistos.has(l.codigo)) {
      problemas.push({
        aba: "Lançamentos",
        linha: l.linha,
        motivo: "O mesmo código aparece em mais de uma linha — só a primeira vale.",
      });
      continue;
    }
    vistos.add(l.codigo);

    const [p] = analisarLinhas([l.cru], mapa);
    if (p.problema) {
      problemas.push({
        aba: "Lançamentos",
        linha: l.linha,
        motivo: `Linha ${p.problema} — o lançamento não foi alterado.`,
      });
      continue;
    }

    let categoria_id: string | null = null;
    if (texto(p.categoriaTexto)) {
      categoria_id = casarCategoria(p.categoriaTexto, catsParaCasar, p.tipo);
      if (!categoria_id) {
        problemas.push({
          aba: "Lançamentos",
          linha: l.linha,
          motivo: `A categoria "${p.categoriaTexto}" não existe no app — a categoria ficou como estava.`,
        });
        categoria_id = atual.categoria_id;
      }
    }

    let subcategoria_id: string | null = null;
    if (texto(p.subcategoriaTexto) && categoria_id) {
      subcategoria_id = casarPorNome(p.subcategoriaTexto, subsParaCasar(categoria_id));
      if (!subcategoria_id) {
        problemas.push({
          aba: "Lançamentos",
          linha: l.linha,
          motivo: `A subcategoria "${p.subcategoriaTexto}" não existe nessa categoria — ficou como estava.`,
        });
        subcategoria_id = atual.categoria_id === categoria_id ? atual.subcategoria_id : null;
      }
    }

    let conta_id: string | null = null;
    if (texto(p.contaTexto)) {
      conta_id = casarPorNome(p.contaTexto, contasParaCasar);
      if (!conta_id) {
        problemas.push({
          aba: "Lançamentos",
          linha: l.linha,
          motivo: `A conta "${p.contaTexto}" não existe no app — a conta ficou como estava.`,
        });
        conta_id = atual.conta_id;
      }
    }

    const novos: CamposGravaveis = {
      tipo: p.tipo,
      valor: Math.round(Math.abs(p.valor!) * 100) / 100,
      descricao: p.descricao,
      data_registro: p.data!,
      data_vencimento: p.vencimento,
      situacao: p.situacao,
      categoria_id,
      subcategoria_id: categoria_id ? subcategoria_id : null,
      conta_id,
      forma_pagamento: p.forma,
      responsavel: p.responsavel,
      observacao: p.observacao,
    };

    const campos: string[] = [];
    const comparar = (rotulo: string, a: string | null, b: string | null) => {
      if ((a ?? null) !== (b ?? null)) campos.push(rotulo);
    };
    comparar("data", atual.data_registro.slice(0, 10), novos.data_registro);
    comparar("vencimento", atual.data_vencimento?.slice(0, 10) ?? null, novos.data_vencimento);
    comparar("descrição", texto(atual.descricao), novos.descricao);
    if (Math.round(atual.valor * 100) !== Math.round(novos.valor * 100)) campos.push("valor");
    comparar("tipo", atual.tipo, novos.tipo);
    comparar("situação", atual.situacao, novos.situacao);
    comparar("categoria", atual.categoria_id, novos.categoria_id);
    comparar("subcategoria", atual.subcategoria_id, novos.subcategoria_id);
    comparar("conta", atual.conta_id, novos.conta_id);
    comparar("forma de pagamento", ouNulo(atual.forma_pagamento), novos.forma_pagamento);
    comparar("responsável", ouNulo(atual.responsavel), novos.responsavel);
    comparar("observação", ouNulo(atual.observacao), novos.observacao);

    if (campos.length > 0) {
      mudancas.push({ id: atual.id, linha: l.linha, descricao: novos.descricao, campos, novos });
    } else {
      semMudanca += 1;
    }
  }

  return { renomes, mudancas, novas, problemas, semMudanca };
}
