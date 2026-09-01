# Modelo de dados e regras de negócio

## Entidades

| Tabela | Papel |
| --- | --- |
| `perfis` | Nome de exibição, tema, cor de acento, cor pessoal, meta em destaque |
| `contas` | Bancos e carteiras: tipo, cor, saldo inicial, meios habilitados, nº de contas |
| `cartoes` | Cartões de crédito: banco, bandeira, final, limite, fechamento, vencimento, cor |
| `categorias` / `subcategorias` | Cor de fundo e cor de texto próprias, tipo despesa/receita |
| `formas_pagamento` | Débito, Crédito, Pix, Dinheiro + as que o usuário criar |
| `metas` | Alvo, guardado, banco, aplicação, prazo (número + unidade) |
| `orcamentos` | Limite por categoria e mês |
| `lancamentos` | Núcleo do sistema (ver abaixo) |
| `importacoes` | Histórico de OFX/CSV/planilhas importadas |

## Regras de negócio

**1. Aporte não é despesa.** `tipo = 'aporte'` movimenta dinheiro da conta para a meta.
Some do total de despesas, da rosca de categorias, das barras de evolução, dos
orçamentos, do saldo e de todos os relatórios. Aparece no extrato com seta ↗, em azul,
com o rótulo "guardado". O trigger `sincronizar_meta` mantém `metas.guardado` em dia em
insert, update e delete.

**2. Sinal pelo tipo, não pelo valor.** `valor` é sempre positivo; receita soma, despesa
subtrai. Isso evita relatórios errados por sinal invertido em importações.

**3. Situação.** Despesa → `pago` | `a_pagar`. Receita → `recebido` | `a_receber`.
Aporte → `guardado`. Lançamento com `data_registro` futura entra automaticamente em
`a_pagar`/`a_receber`.

**4. Séries.** Parcelamento, recorrência e assinatura compartilham `serie_id`. Cada
ocorrência é um lançamento independente — editável e excluível isoladamente. Ofereça
"editar só esta / editar a série toda" quando `serie_id` estiver presente.

**5. Fatura do cartão.** É a soma dos lançamentos com `cartao_id` daquele cartão no mês
de referência. O ciclo real usa `dia_fechamento`: compras após o fechamento caem na
fatura seguinte — implemente isso ao migrar do protótipo, que agrupa por mês corrido.

**6. Orçamento.** Estado por percentual: <80% ok (verde), 80–99% quase (âmbar),
≥100% ultrapassou (vermelho).

**7. Pendências.** `incompleto = true` marca o que veio do Registro Fácil sem categoria
ou conta. O contador aparece no Início (com pulso vermelho) e em Ajustes.

**8. Conciliação.** `fitid` é único por usuário (`unique (user_id, fitid)`) — é o que
impede que reimportar o mesmo OFX duplique lançamentos. Casamento: mesmo valor absoluto
e data até 3 dias de distância, sem reaproveitar um lançamento já casado na mesma
importação. Grave o `fitid` tanto ao conciliar quanto ao criar a partir do banco.

**9. Isolamento de perfis.** RLS por `auth.uid()` em todas as tabelas. Nenhuma consulta
do cliente pode depender de filtro por `user_id` no código — a política é a garantia.

## Fluxos que valem teste automatizado
- Salvar parcelada 3/10 gera 8 lançamentos, todos com o mesmo `serie_id`, os futuros em `a_pagar`.
- Assinatura de 12 meses gera 12 cobranças numeradas.
- Recorrente personalizada respeita a data final e nunca passa de 240 ocorrências.
- Aporte de R$ 500 sobe `metas.guardado` em 500 e não altera `v_movimento_mensal`.
- Excluir um aporte devolve o valor à meta.
- Reimportar o mesmo OFX resulta em zero lançamentos criados.
- Mudar a cor de uma categoria reflete no extrato, na rosca e nas faturas.
