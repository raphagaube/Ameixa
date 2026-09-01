# Handoff: Ameixa — app de gestão financeira pessoal

## Visão geral
Ameixa é um app de finanças pessoais, mobile-first, para uso individual com perfis
isolados (cada pessoa vê apenas os próprios dados). Cobre lançamentos de receitas,
despesas e aportes em metas, contas bancárias, cartões de crédito e faturas,
categorias com cores, orçamentos por categoria, metas de economia, relatórios com
exportação em PDF e Excel, e conciliação bancária por arquivo OFX.

O protótipo navegável já existe e está neste pacote (`Financas.dc.html`). Ele é a
referência de comportamento e de aparência.

## Sobre os arquivos de design
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que
mostram a aparência e o comportamento pretendidos, **não** código de produção para
copiar. A tarefa é **recriar estes designs no ambiente da aplicação alvo**, seguindo os
padrões da stack escolhida.

Stack recomendada para esta entrega (o usuário já definiu Supabase + Vercel + GitHub):

- **Next.js 15 (App Router) + TypeScript + React 19**
- **Tailwind CSS v4** com os tokens da seção "Design tokens" mapeados em CSS variables
- **Supabase** (Postgres + Auth + Storage + RLS) — banco, autenticação e recuperação de senha
- **Vercel** — hospedagem, preview por PR e variáveis de ambiente
- **GitHub** — repositório e CI

O protótipo é **alta fidelidade (hifi)**: cores, tipografia, espaçamentos e interações
são definitivos. Recrie a UI fielmente.

## Estrutura de telas

Navegação: barra inferior fixa com 5 abas — **Início, Extrato, Relatórios, Metas,
Ajustes**. Telas de segundo nível (Pendências, Orçamentos, Cartões, Categorias) abrem
com botão de voltar no cabeçalho e pilha de histórico própria. Botão flutuante
"Registro fácil" acima da barra, presente em todas as telas do app.

Largura máxima do conteúdo: 430px centralizado; padding lateral 16px; padding inferior
156px (para não colidir com o botão flutuante e a barra).

### 1. Entrada (login / cadastro / recuperar senha)
Tela sem barra de abas, centralizada verticalmente.
- Logo (imagem, 46px de largura) + wordmark "Ameixa" 30px/700.
- Título 38px/700, subtítulo 14px em `--mut`.
- Campos empilhados (gap 12px): label 11px maiúscula `letter-spacing:.12em` em `--mut`,
  input padding 12px, borda 1px `--ln`, radius 12px, fonte 15px.
- Botão primário: fundo `--ac`, texto `--on-ac`, padding 14px, 16px maiúsculo
  `letter-spacing:.1em`.
- Rodapé com dois links de texto: alternar cadastro/login e "Esqueci a senha".
- Três modos: **login** (e-mail, senha), **cadastro** (nome, e-mail, senha, confirmar),
  **recuperar** (e-mail → envia link de redefinição).

### 2. Início
- Cabeçalho: kicker "Meu painel" 11px maiúsculo + título "Olá, {nome}" 30px.
  Botão de alternar claro/escuro à direita (38×38).
- Seletor de mês: grade `44px 1fr 44px` — setas ‹ › e botão central com "Setembro 2026"
  que abre folha com grade de 12 meses (4 colunas) e navegação de ano.
- **Card de saldo**: fundo `--tint`, radius 16px. "Saldo total · {mês}" 11px maiúsculo;
  valor 44px/700; abaixo, duas células (Receitas em `--ok`, Despesas em `--bad`), 20px.
- **Aviso de pendências**: quando há lançamentos incompletos, bloco com borda `--bad`,
  ícone de alerta e animação de pulso (halo `box-shadow` 2.4s, respeitando
  `prefers-reduced-motion`). Sem pendências: bloco em `--tint` com borda `--deep` e o
  texto "Não há lançamentos pendentes! 🥳".
- **Meta em destaque**: nome, botão "Trocar" (abre seletor de metas), banco · tipo,
  valor atual / alvo, barra de progresso 8px em pílula, e linha com percentual e prazo.
- **Orçamentos do mês**: três primeiros, cada um com nome, resumo colorido por estado e
  barra 6px.
- **Últimos lançamentos**: 4 itens; avatar 32px com a cor da categoria, descrição,
  metadados 12px, valor 16px à direita.

### 3. Extrato
- Filtros de período: 4 botões — Dia, Mês, Ano, Faixa.
- Navegador de período (grade `44px 1fr 44px`) para Dia/Mês/Ano; em **Faixa**, dois
  grupos de campos data inicial e final (dia digitado + mês em `select` + ano em
  `select`), com **Aplicar filtro** e **Remover**.
- **Painel de busca** (borda 1px, radius 14px): texto livre; selects de categoria,
  subcategoria (dependente), situação, forma de pagamento e responsável; botões
  **Buscar repetidos** e **Limpar**.
- **Ordenação** (select): mais novos primeiro (padrão), mais antigos primeiro, maior
  valor, menor valor.
- Linha de resumo: período à esquerda, "N lançamentos · ± R$ X" à direita.
- Lista agrupada por dia (cabeçalho com data e total do dia) nas ordens por data; lista
  corrida com a data em cada item nas ordens por valor. Cada linha é clicável e abre o
  formulário de edição.
- Estado vazio: "Nenhum lançamento neste período."

### 4. Tela de repetidos (a partir de "Buscar repetidos")
Tela cheia. Agrupa lançamentos com mesmo valor e mesma descrição. Cada grupo mostra
título, valor, quantidade e botão **Mesclar** (marca todas menos a primeira para
exclusão). Cada ocorrência: data · conta · forma, lápis para editar e botão que alterna
**Manter / Excluir**. Barra fixa inferior com contagem e **Salvar alterações**.

### 5. Registro fácil (folha inferior)
Aberta pelo botão flutuante. Radius 20px no topo, `max-height:88vh` com rolagem.
- Segmento Despesa / Receita.
- Display do valor em bloco `--tint`, 40px.
- Chips de conta (4 primeiras contas cadastradas).
- Teclado numérico 3×4 (1–9, vírgula, 0, ⌫).
- **Salvar e completar depois** → cria uma pendência com o valor.
- **Adicionar detalhes agora** → abre o formulário completo já preenchido.

### 6. Pendências
Lista de lançamentos rápidos incompletos: valor 24px, quando, descrição, chips
tracejados com o que falta, e botões **Completar** (abre o formulário completo) e
**Excluir**. Estado vazio: "Tudo em dia — nenhum lançamento pendente."

### 7. Formulário de lançamento (folha inferior, `max-height:92vh`)
Título: "Novo lançamento" / "Completar lançamento" / "Editar lançamento".
1. **Tipo**: Despesa | Receita | Guardar em meta (grade `1fr 1fr 1.3fr`).
   - Em "Guardar em meta": some categoria, meio de pagamento e repetição; aparece a
     lista de metas. O valor sai da conta e **entra na meta**, sem contar como despesa.
2. **Valor** + **Situação** (Já pago / A pagar para despesa; Recebido / A receber para receita).
3. **Descrição**.
4. **Data do registro** (dia, mês, ano).
5. **Vencimento** (dia, mês, ano).
6. **Categoria** em chips coloridos + subcategorias da categoria escolhida.
7. **Conta / banco** (grade 2 colunas).
8. **Meio de pagamento** (Débito, Crédito, Pix, Dinheiro + formas personalizadas);
   escolhendo Crédito, aparece a lista de cartões. Campo "Nova forma de pagamento" +
   botão Adicionar.
9. **Repetição**: Única | Parcelada | Recorrente | Assinatura.
   - **Parcelada**: parcela atual + total; gera as parcelas seguintes nos meses à frente
     com sufixo "3/10" e status a pagar/a receber.
   - **Recorrente**: frequência Semanal, Quinzenal, Mensal, Semestral, Anual ou
     Personalizado (repete mensalmente até a data escolhida); campo "repetições a gerar".
   - **Assinatura**: nome do serviço, valor e quantidade de meses; gera as cobranças
     mensais numeradas.
10. **Responsável** (bloco próprio, emoldurado, com ícone).
11. **Observação** (textarea).
12. **Salvar lançamento** e, em edição, **Excluir lançamento**.

### 8. Orçamentos
Legenda de três estados (verde tudo certo, âmbar quase lá, vermelho ultrapassou), atalho
para Categorias, e um cartão por categoria: nome, percentual, "R$ gasto de R$ limite",
barra e frase de aviso. Regra: <80% verde, 80–99% âmbar, ≥100% vermelho.

### 9. Categorias
Botão "Nova categoria" e um cartão por categoria: nome em pílula com a cor e a cor de
texto da categoria, faixa lateral 4px na cor, tipo, contagem de subcategorias, chips das
subcategorias e botão **Editar**.
Folha de edição: nome, tipo (Despesa/Receita), **cor** (color picker + 8 atalhos),
**cor do texto** (color picker + Claro / Escuro / **Automático**, que escolhe por
luminância), subcategorias (chips removíveis + campo e botão Adicionar), Salvar e Excluir.

### 10. Metas
Botão "Nova meta". Cada meta: nome, **lápis** para editar, selo clicável "No painel" /
"Mostrar no painel", banco · tipo · prazo, valor atual e alvo (22px), barra e nota.
Folha: nome, quanto quero juntar, **quanto já guardei**, banco, tipo de aplicação
(Poupança, CDB, Tesouro, Ações), prazo (Sem prazo / Com prazo → número + Dias, Semanas,
Meses, Anos), Salvar e Excluir.

### 11. Cartões e contas
- **Faturas do mês**: um cartão por cartão de crédito. Cabeçalho na cor do cartão com
  nome, bandeira e final, e botão Editar. Corpo: "Fatura aberta" com o total 34px, quanto
  representa das despesas do mês, três células (Fechamento, Vencimento, Limite), barra de
  uso do limite (âmbar ≥70%, vermelho ≥90%), disponível, e a lista de compras da fatura
  com a cor da categoria.
- Botão **Adicionar cartão de crédito** → folha com nome, banco, bandeira, 4 últimos
  dígitos, limite, dia de fechamento, dia de vencimento e cor.
- **Bancos e carteiras**: botão Adicionar banco e um cartão por banco com nome em pílula
  colorida, saldo, tipo, quantidade de contas, chips dos meios e botão Editar.
  Folha: nome, tipo, "Uma conta / Mais de uma" (+ quantidade), meios (Débito, Crédito,
  Pix), saldo, bloco de cartão (limite, fechamento, vencimento) quando crédito está
  ativo, e cor com picker + 8 atalhos.

### 12. Relatórios
- **Para onde foi o dinheiro**: rosca 186px com furo 118px (total e % da receita no
  miolo), montada com `conic-gradient` a partir das despesas reais do mês agrupadas por
  categoria, e legenda com nome, valor e percentual.
- **Receitas × despesas**: legenda (verde/vermelho), 6 meses, valor curto acima de cada
  barra (5,2k) e tabela mês / receitas / despesas / saldo.
- **De onde veio**: receitas agrupadas por categoria com barra.
- **Montar relatório**: período (Este mês, Últimos 3 meses, Ano, Período livre com datas
  detalhadas, Todo o período), seções marcáveis (Resumo, Gastos por categoria, Evolução
  mensal, Origem das receitas, Lançamentos detalhados, Orçamentos, Metas), **Situação dos
  lançamentos** (Pago, A pagar, Recebido, A receber), **Mostrar / Ocultar valores** e
  **Com dados técnicos / Só o essencial**. Botão **Gerar relatório**.

### 13. Documento do relatório (tela cheia)
Cabeçalho com logo, "Relatório financeiro", período, intervalo em datas e dias, e linha
de emissão com o nome do usuário. Seções numeradas dinamicamente conforme o que foi
ativado. Barra superior com **Excel** e **Baixar PDF**.
Indicadores técnicos calculados: média diária de gasto, ticket médio, maior despesa,
variação vs. período anterior de mesma duração, gasto fixo comprometido, projeção
mensal, participação do cartão e dias sem gastar.
Com "Ocultar valores", todo valor monetário vira `••••••` e só ficam os percentuais.

### 14. Ajustes
- **Tema**: Claro / Escuro; quatro opções de cor — Rosa, Azul, Verde e **Minha cor**
  (color picker que salva a cor personalizada e pode ser trocada quando quiser).
- **Dados**: Exportar/Importar JSON e CSV; **Importar planilhas** (Excel do aparelho e
  Planilhas Google por link); **Conciliação bancária (OFX)**.
- **Conta**: Alterar nome (usado na saudação e nos relatórios), e-mail, alterar senha,
  perfis separados, Sair.
- **Atalhos**: Cartões e contas, Orçamentos, Categorias, Pendências.
- Rodapé com o logo e "Ameixa · v1.0".

### 15. Conciliação bancária (OFX)
Tela cheia. Lê arquivos OFX/QFX (blocos `STMTTRN`: `DTPOSTED`, `TRNAMT`, `MEMO`/`NAME`,
`FITID`). Seleção da conta do extrato. Cada movimento é classificado:
- **Confere** — mesmo valor e mesma data;
- **Provável** — mesmo valor, data até 3 dias de distância;
- **Novo no banco** — sem correspondência;
- **Já conciliado** — o `FITID` já existe em algum lançamento (não recria nada).

Ações por linha: **Conciliar**, **Criar novo**, **Ignorar**, mais lápis para editar o
lançamento correspondente. As sugestões vêm pré-selecionadas e são a fonte da verdade
do que será gravado. Bloco **Só no app** lista lançamentos sem correspondência no
extrato. **Aplicar conciliação** grava o `FITID` no lançamento conciliado ou no
lançamento criado.

## Interações e comportamento
- Todas as folhas inferiores: `position:fixed`, radius 20px 20px 0 0, animação
  `translateY(14px) → 0` com fade em 180ms `ease-out`, backdrop `rgba(0,0,0,.45)`
  que fecha ao clique, `overscroll-behavior:contain`.
- Avisos (toasts): 2,4–2,8s, canto inferior centralizado, borda esquerda 3px colorida
  conforme a natureza (sucesso, exclusão, série gerada, conciliação).
- Pulso do aviso de pendências: 2,4s infinito; desligado em `prefers-reduced-motion`.
- Aportes em meta nunca entram em despesas, gráficos, orçamentos, saldo ou relatórios.
- Lançamentos com data futura entram automaticamente como "a pagar" / "a receber".
- O tema deriva toda a família de cores de um único hex (ver "Cor derivada").

## Modelo de dados
Ver `docs/modelo-de-dados.md` e o SQL pronto em `supabase/schema.sql`,
`supabase/policies.sql` e `supabase/seed.sql`.

## Design tokens

### Tipografia
- Família única: **Open Sans** (400, 500, 600, 700), via Google Fonts.
- Títulos de tela 30px/700; título de folha 21px; `h4` de seção 17px/700;
  corpo 14–15px; metadados 12px; rótulo de campo 11px maiúsculo `letter-spacing:.12em`;
  botões maiúsculos 12–16px com `letter-spacing:.06–.1em`.
- Valores monetários grandes: 44px (saldo), 34px (fatura), 40px (registro fácil).

### Raio
- Cartões e blocos: **16px** · botões e campos: **12px** · folhas: 20px no topo
- Barras, chips e pontos: pílula (999px) · avatares de categoria: 10px
- Barra de abas: 0 (encosta na borda)

### Cores — tema claro
```
--color-bg  #f4f4f3   --sf #ffffff   --color-text #1c1e20   --mut #7b7f83
--ln rgba(28,30,32,.16)   --ln2 rgba(28,30,32,.08)
--ok #3f8a5f   --warn #b8862a   --bad #c0554f   --on-ac #14161a
```

### Cores — tema escuro
```
--color-bg  #000000   --sf #131313   --color-text #f4f4f4   --mut #8a8a8a
--ln rgba(255,255,255,.18)   --ln2 rgba(255,255,255,.09)
--ok #7fc79c   --warn #e0b45f   --bad #e5867f   --on-ac #000000
```

### Acento e cor derivada
Acentos pré-definidos: Rosa `#E7A8C4`, Azul `#93B4D8`, Verde `#93C9A8` (padrão), mais
"Minha cor" livre. A partir do hex escolhido, derive em HSL:
- `--ac` = o próprio hex
- `--on-ac` = tinta por luminância: `L = (0.299R + 0.587G + 0.114B)/255`;
  `L > 0.6 → #14161a`, senão `#ffffff`
- `--deep` (texto/ícone sobre o fundo): claro → `hsl(h, min(s+14,88)%, min(l,34)%)`;
  escuro → `hsl(h, min(s+8,92)%, max(l,74)%)`
- `--tint` (fundo suave): claro → `hsl(h, min(s+6,80)%, max(l,94)%)`;
  escuro → `hsl(h, s%, max(l,55)% / .16)`
- `--chart2` (segunda cor de gráfico): `hsl((h+38)%360, min(s+6,78)%, escuro?68%:44%)`
- Saturação mínima de 22% para acentos quase cinzas.

**Regra crítica**: elementos coloridos (abas ativas, barras, botões) usam `--deep`, nunca
`--ac` puro — com um acento quase preto no tema escuro, `--ac` desaparece no fundo.

### Espaçamento
Escala usada: 4, 6, 8, 10, 12, 14, 16, 18, 22 px. Gap padrão entre blocos: 12–16px.
Padding de cartão: 13–15px × 14px. Listas de células: `gap:1px` sobre fundo `--ln`
(hairline), com o contêiner arredondado e as células retas.

## Ativos
- `ameixa-icone-crop.png` — ícone da marca (ameixa em traço), fornecido pelo usuário e
  recortado. Usado na entrada (46px), no cabeçalho do relatório (38px) e no rodapé dos
  Ajustes (30px). No tema claro entra em `mix-blend-mode:multiply`; no escuro,
  `filter:invert(1)` + `mix-blend-mode:screen`; na impressão, sempre multiply.
  **Recomendação**: converter para SVG monocromático e colorir por `currentColor`.

## Arquivos deste pacote
- `Financas.dc.html` — protótipo navegável completo (referência de design)
- `ameixa-icone-crop.png` — ícone da marca
- `docs/modelo-de-dados.md` — entidades, campos e regras de negócio
- `docs/deploy-github-vercel-supabase.md` — passo a passo de infraestrutura
- `docs/plano-de-implementacao.md` — ordem de trabalho e prompts para o Claude Code
- `supabase/schema.sql` — tabelas, tipos e índices
- `supabase/policies.sql` — RLS por usuário
- `supabase/functions.sql` — geração de séries e views de relatório
- `supabase/seed.sql` — categorias e dados iniciais
- `CLAUDE.md` — instruções permanentes para o Claude Code no repositório
