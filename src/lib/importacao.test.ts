import { describe, expect, it } from "vitest";
import { lerCsv } from "./csv";
import {
  analisarLinhas,
  casarCategoria,
  normalizarNomeCategoria,
  casarPorNome,
  palpitarMapeamento,
  resumir,
} from "./importacao";

/** Cabeçalho igual ao da planilha real que motivou o assistente. */
const COLUNAS_REAIS = [
  "id",
  "data",
  "tipo",
  "categoria",
  "subcategoria",
  "descricao",
  "valor",
  "pagamento",
  "apelido cartao",
  "responsavel",
  "observacao",
  "status",
  "vencimento",
  "data baixa",
  "ultima alteracao",
  "grupo recorrencia",
  "parcela",
];

describe("palpite de mapeamento", () => {
  it("acerta os campos da planilha real", () => {
    const m = palpitarMapeamento(COLUNAS_REAIS);
    expect(m.data).toBe("data");
    expect(m.descricao).toBe("descricao");
    expect(m.valor).toBe("valor");
    expect(m.tipo).toBe("tipo");
    expect(m.status).toBe("status");
    expect(m.categoria).toBe("categoria");
  });

  /** "Data Baixa" não pode roubar o lugar de "Data". */
  it("prefere o nome exato ao que só começa igual", () => {
    expect(palpitarMapeamento(["data baixa", "data"]).data).toBe("data");
  });

  it("não usa a mesma coluna em dois campos", () => {
    const m = palpitarMapeamento(["data", "descricao", "valor"]);
    const usadas = Object.values(m);
    expect(new Set(usadas).size).toBe(usadas.length);
  });

  it("reconhece nomes de extrato de banco", () => {
    const m = palpitarMapeamento(["data", "historico", "valor"]);
    expect(m.descricao).toBe("historico");
  });

  it("deixa em branco o que não achou", () => {
    expect(palpitarMapeamento(["data", "valor"]).descricao).toBeUndefined();
  });
});

describe("análise das linhas", () => {
  const linhas = lerCsv(
    [
      "Data,Descrição,Tipo,Valor,Status",
      "01/07/2025 12:00:00,Mercado,Despesa,\"83,63\",PAGO",
      "03/07/2025 12:00,Salário,Receita,\"2.400,00\",RECEBIDO",
      ",Sem data,Despesa,\"10,00\",",
    ].join("\n"),
  );
  const mapa = palpitarMapeamento(Object.keys(linhas[0]));
  const previas = analisarLinhas(linhas, mapa);

  it("entende data com hora junto", () => {
    expect(previas[0].data).toBe("2025-07-01");
  });

  it("entende valor em formato brasileiro", () => {
    expect(previas[1].valor).toBe(2400);
  });

  it("usa a coluna Tipo em vez de adivinhar pelo sinal", () => {
    expect(previas[0].tipo).toBe("despesa");
    expect(previas[1].tipo).toBe("receita");
  });

  it("traduz o Status para a situação certa de cada tipo", () => {
    expect(previas[0].situacao).toBe("pago");
    expect(previas[1].situacao).toBe("recebido");
  });

  /** O usuário precisa saber qual linha está errada, não só que "deu erro". */
  it("aponta o problema e a linha da planilha", () => {
    expect(previas[2].problema).toBe("sem data");
    expect(previas[2].numero).toBe(4);
  });

  it("linha boa não tem problema", () => {
    expect(previas[0].problema).toBeNull();
  });
});

describe("resumo antes de gravar", () => {
  const linhas = lerCsv(
    [
      "Data,Descrição,Tipo,Valor",
      "01/07/2025,Mercado,Despesa,100",
      "02/07/2025,Salário,Receita,500",
      ",Ruim,Despesa,10",
    ].join("\n"),
  );
  const r = resumir(analisarLinhas(linhas, palpitarMapeamento(Object.keys(linhas[0]))));

  it("conta quantas entram e quantas ficam de fora", () => {
    expect(r.total).toBe(3);
    expect(r.validas).toBe(2);
    expect(r.comProblema).toBe(1);
  });

  it("soma receitas e despesas separadas", () => {
    expect(r.somaReceitas).toBe(500);
    expect(r.somaDespesas).toBe(100);
  });

  it("mostra o intervalo de datas do que será importado", () => {
    expect(r.primeiraData).toBe("2025-07-01");
    expect(r.ultimaData).toBe("2025-07-02");
  });

  it("nada válido não quebra o resumo", () => {
    const vazio = resumir([]);
    expect(vazio.validas).toBe(0);
    expect(vazio.primeiraData).toBeNull();
  });
});

describe("casamento de categoria", () => {
  const cats = [
    { id: "c1", nome: "Alimentação", tipo: "despesa" as const },
    { id: "c2", nome: "Saúde", tipo: "despesa" as const },
    { id: "c3", nome: "Salário", tipo: "receita" as const },
  ];

  /** A planilha traz o nome com a explicação junto, entre parênteses. */
  it("ignora a explicação entre parênteses", () => {
    expect(
      casarCategoria(
        "ALIMENTAÇÃO (supermercado, varejão, padaria, açougue)",
        cats,
        "despesa",
      ),
    ).toBe("c1");
  });

  it("ignora acento e caixa", () => {
    expect(casarCategoria("saude", cats, "despesa")).toBe("c2");
  });

  it("não casa categoria de despesa com lançamento de receita", () => {
    expect(casarCategoria("Alimentação", cats, "receita")).toBeNull();
  });

  it("casa receita com receita", () => {
    expect(casarCategoria("RECEITAS (salário, benefícios)", cats, "receita")).toBeNull();
    expect(casarCategoria("Salário", cats, "receita")).toBe("c3");
  });

  it("nome desconhecido não inventa categoria", () => {
    expect(casarCategoria("REFEIÇÕES FORA", cats, "despesa")).toBeNull();
  });

  it("texto vazio devolve null", () => {
    expect(casarCategoria("", cats, "despesa")).toBeNull();
    expect(casarCategoria("   ", cats, "despesa")).toBeNull();
  });

  it("normaliza como esperado", () => {
    expect(normalizarNomeCategoria("ALIMENTAÇÃO (x, y)")).toBe("alimentacao");
  });
});

describe("colunas novas da planilha do Ameixa", () => {
  const cabecalho = [
    "data",
    "vencimento",
    "descricao",
    "valor",
    "tipo",
    "situacao",
    "categoria",
    "subcategoria",
    "conta",
    "forma de pagamento",
    "responsavel",
    "observacao",
  ];

  it("reconhece sozinho todas as colunas do modelo", () => {
    expect(palpitarMapeamento(cabecalho)).toEqual({
      data: "data",
      vencimento: "vencimento",
      descricao: "descricao",
      valor: "valor",
      tipo: "tipo",
      status: "situacao",
      categoria: "categoria",
      subcategoria: "subcategoria",
      conta: "conta",
      forma: "forma de pagamento",
      responsavel: "responsavel",
      observacao: "observacao",
    });
  });

  const analisar = (p: Record<string, string>) =>
    analisarLinhas(
      [
        {
          data: "10/09/2026",
          vencimento: "",
          descricao: "Luz",
          valor: "100,00",
          tipo: "Despesa",
          situacao: "",
          categoria: "",
          subcategoria: "",
          conta: "",
          "forma de pagamento": "",
          responsavel: "",
          observacao: "",
          ...p,
        },
      ],
      palpitarMapeamento(cabecalho),
    )[0];

  it("lê vencimento, subcategoria, conta e forma de pagamento", () => {
    expect(
      analisar({
        vencimento: "15/09/2026",
        subcategoria: "Luz",
        conta: "PAG BANK",
        "forma de pagamento": "Pix",
      }),
    ).toMatchObject({
      vencimento: "2026-09-15",
      subcategoriaTexto: "Luz",
      contaTexto: "PAG BANK",
      forma: "Pix",
      problema: null,
    });
  });

  it("vencimento em branco fica vazio; ilegível é apontado", () => {
    expect(analisar({}).vencimento).toBeNull();
    expect(analisar({ vencimento: "amanhã" }).problema).toContain("vencimento");
  });

  it("entende a situação do jeito que o próprio app escreve", () => {
    expect(analisar({ situacao: "Já pago" }).situacao).toBe("pago");
    expect(analisar({ situacao: "Pago" }).situacao).toBe("pago");
    expect(analisar({ situacao: "A pagar" }).situacao).toBe("a_pagar");
    expect(analisar({ tipo: "Receita", situacao: "Já recebido" }).situacao).toBe("recebido");
    expect(analisar({ tipo: "Receita", situacao: "A receber" }).situacao).toBe("a_receber");
  });
});

describe("casarPorNome", () => {
  const contas = [
    { id: "1", nome: "PAG BANK" },
    { id: "2", nome: "PAG BANK COFRINHO" },
    { id: "3", nome: "Caixa Econômica" },
  ];

  it("prefere o nome exato, sem acento nem caixa", () => {
    expect(casarPorNome("pag bank", contas)).toBe("1");
    expect(casarPorNome("PAG BANK COFRINHO", contas)).toBe("2");
    expect(casarPorNome("caixa economica", contas)).toBe("3");
  });

  it("nome desconhecido ou vazio não inventa", () => {
    expect(casarPorNome("Nubank", contas)).toBeNull();
    expect(casarPorNome("", contas)).toBeNull();
  });
});
