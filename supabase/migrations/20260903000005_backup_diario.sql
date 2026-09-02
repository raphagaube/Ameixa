-- Foto diária dos dados, dentro do próprio banco.
--
-- Nasceu de um estrago real: em 02/09/2026 uma limpeza automática do app
-- apagou as cinco contas do dono, os cartões e o vínculo de conta de todos
-- os lançamentos. Não havia de onde restaurar — o plano gratuito do
-- Supabase não tem nem snapshot diário nem recuperação por horário, e o
-- backup manual nunca tinha sido baixado.
--
-- Isto protege contra o tipo de perda que aconteceu: código apagando o que
-- não devia. NÃO protege contra perder o projeto inteiro do Supabase —
-- para isso é preciso uma cópia fora daqui.

create schema if not exists backup;
revoke all on schema backup from anon, authenticated;

create table if not exists backup.fotos (
  dia     date not null,
  tabela  text not null,
  linhas  integer not null,
  dados   jsonb not null,
  tirada_em timestamptz not null default now(),
  primary key (dia, tabela)
);

comment on table backup.fotos is
  'Uma linha por tabela por dia. Restaurar: veja backup.restaurar().';

/**
 * As tabelas que guardam o que o dono digitou.
 *
 * `lancamentos` fica por último de propósito: ela aponta para quase todas
 * as outras, então na restauração as referências já existem.
 */
create or replace function backup.tabelas()
returns text[] language sql immutable as $$
  select array[
    'perfis', 'contas', 'cartoes', 'categorias', 'subcategorias',
    'formas_pagamento', 'metas', 'orcamentos', 'importacoes',
    'eventos_agenda', 'lancamentos'
  ];
$$;

/** Tira a foto do dia. Rodar de novo no mesmo dia atualiza a foto. */
create or replace function backup.tirar_foto(p_dia date default current_date)
returns integer
language plpgsql security definer set search_path = public, backup, pg_temp
as $$
declare
  t text;
  j jsonb;
  n integer;
  total integer := 0;
begin
  foreach t in array backup.tabelas() loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I x', t)
      into j;
    n := jsonb_array_length(j);

    insert into backup.fotos (dia, tabela, linhas, dados, tirada_em)
    values (p_dia, t, n, j, now())
    on conflict (dia, tabela) do update
      set linhas = excluded.linhas,
          dados = excluded.dados,
          tirada_em = excluded.tirada_em;

    total := total + n;
  end loop;

  -- Sete dias bastam: o que este backup protege é engano recente, e
  -- guardar mês inteiro encheria o plano gratuito à toa.
  delete from backup.fotos where dia < p_dia - 7;

  return total;
end $$;

/**
 * Devolve as linhas de uma tabela como estavam num dia.
 *
 * Não escreve nada de propósito: restaurar é decisão de gente, não de
 * função agendada. Use assim, conferindo antes de gravar:
 *
 *   select * from backup.restaurar('2026-09-02', 'contas');
 */
create or replace function backup.restaurar(p_dia date, p_tabela text)
returns setof jsonb
language sql stable security definer set search_path = public, backup, pg_temp
as $$
  select jsonb_array_elements(dados)
  from backup.fotos
  where dia = p_dia and tabela = p_tabela;
$$;

-- ── Agendamento ────────────────────────────────────────────────────
create extension if not exists pg_cron;

-- 06:00 UTC = 03:00 em Brasília. Fora do horário de uso, e antes de
-- qualquer coisa que o dono faça no dia.
select cron.unschedule('ameixa-backup-diario')
  where exists (select 1 from cron.job where jobname = 'ameixa-backup-diario');

select cron.schedule(
  'ameixa-backup-diario',
  '0 6 * * *',
  $cron$ select backup.tirar_foto(); $cron$
);

-- Primeira foto agora, para não esperar a madrugada.
select backup.tirar_foto();
