-- Data de corte do saldo.
--
-- Problema real: o usuário importou anos de despesas mas não tem as
-- receitas do mesmo período. Somar saldo inicial + tudo daria um saldo
-- muito mais negativo que a realidade.
--
-- A solução é ancorar: ele informa o saldo real de hoje e a data em que
-- conferiu. O app passa a calcular
--     saldo = saldo_conferido + movimentos DEPOIS da data conferida
-- O histórico continua inteiro nos relatórios; só não polui o saldo.

alter table contas
  add column if not exists saldo_conferido_em date;

comment on column contas.saldo_inicial is
  'Saldo na data de saldo_conferido_em. Quando a data é nula, vale como saldo antes do primeiro lançamento.';

comment on column contas.saldo_conferido_em is
  'Data em que o saldo foi conferido. Só os lançamentos posteriores a ela entram no cálculo do saldo atual.';
