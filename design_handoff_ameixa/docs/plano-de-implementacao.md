# Plano de implementação e prompts para o Claude Code

Ordem sugerida. Cada etapa é um PR pequeno, testável e implantável.

## Etapa 0 — Fundação
Scaffold Next.js, Tailwind com os tokens, layout mobile-first (`max-width:430px`),
tema claro/escuro e a derivação de cor a partir de um hex (ver README › Cor derivada).
Barra de abas, cabeçalho com voltar e o botão flutuante.

> **Prompt:** "Leia `design_handoff_ameixa/README.md` e `Financas.dc.html`. Crie a base do
> app Next.js com App Router: layout mobile-first de 430px, barra de abas inferior com
> Início, Extrato, Relatórios, Metas e Ajustes, cabeçalho com botão de voltar por pilha
> de navegação, e o botão flutuante Registro Fácil. Implemente o tema como CSS variables
> derivadas de um único hex de acento, conforme a seção Design tokens, incluindo o cálculo
> de --on-ac por luminância e a regra de usar --deep, nunca --ac puro, em elementos
> coloridos."

## Etapa 1 — Auth e perfil
Login, cadastro, recuperação por link, sessão em cookie via `@supabase/ssr`, middleware
protegendo as rotas, e `semear_usuario` no primeiro acesso. Ajustes › Conta com
"Alterar nome" refletindo na saudação e nos relatórios.

## Etapa 2 — Cadastros
Contas, cartões, categorias com as duas cores, subcategorias e formas de pagamento
personalizadas. Telas e folhas conforme o README.

## Etapa 3 — Lançamentos
Registro Fácil, pendências, formulário completo (todos os campos), edição e exclusão a
partir do extrato, e a geração de séries (parcelada, recorrente, assinatura) usando
`gerar_serie`.

> **Prompt:** "Implemente o formulário de lançamento completo descrito na seção 7 do
> README, incluindo os três tipos (Despesa, Receita, Guardar em meta), situação
> condicional ao tipo, data de registro e vencimento separadas, responsável, formas de
> pagamento personalizadas e o bloco de repetição com Parcelada, Recorrente e Assinatura.
> Ao salvar, chame `gerar_serie` no Supabase. Aportes devem ficar fora de todos os
> cálculos de receita e despesa."

## Etapa 4 — Extrato
Filtros de período (dia, mês, ano, faixa aplicável), busca por texto, categoria,
subcategoria, situação, forma e responsável, ordenação, agrupamento por dia e a tela de
repetidos com mesclar/excluir/editar.

## Etapa 5 — Metas e orçamentos
Metas com edição pelo lápis, meta em destaque no painel, aportes; orçamentos por
categoria com os três estados.

## Etapa 6 — Relatórios
Rosca por categoria, receitas × despesas com tabela, origem das receitas, montador de
relatório (período, seções, situações, ocultar valores, dados técnicos), documento
imprimível e exportação em Excel.

## Etapa 7 — Importações e conciliação
Importar JSON/CSV, planilha do Excel e Planilhas Google; conciliação OFX completa com as
quatro classificações, ações por linha, bloco "Só no app" e gravação do `fitid`.

> **Prompt:** "Implemente a conciliação bancária OFX descrita na seção 15 do README.
> Parser dos blocos STMTTRN, casamento por valor igual e data até 3 dias, quatro
> classificações (Confere, Provável, Novo no banco, Já conciliado), sugestões
> pré-selecionadas que são a fonte da verdade do que será gravado, e `fitid` único por
> usuário para que reimportar o mesmo arquivo não duplique nada."

## Etapa 8 — Acabamento
PWA instalável, backup JSON/CSV, estados vazios, `prefers-reduced-motion`, foco visível,
alvos de toque de 44px e testes dos fluxos listados em `modelo-de-dados.md`.

## Armadilhas já resolvidas no protótipo — não repita
1. **Nunca** deixe a marca de conciliação fora do lançamento (índice de array quebra ao excluir).
2. Estado de formulário sempre no estado do componente — campos fora dele dessincronizam o salvar.
3. Campos numéricos guardam texto cru e só normalizam ao salvar (converter a cada tecla trava o apagar).
4. Elementos coloridos usam `--deep`; `--ac` puro some quando o acento é quase preto no tema escuro.
5. Duas fatias de gráfico não podem usar `--ac` e `--deep` no tema escuro (são iguais) — use `--chart2`.
6. O período do relatório precisa ser um intervalo de datas concreto, não um rótulo.
