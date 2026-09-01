-- Ameixa · esquema Supabase (Postgres)
-- Rode em Supabase Studio › SQL Editor, ou via `supabase db push`.

create extension if not exists "pgcrypto";

-- ─────────────────────────────  Tipos  ─────────────────────────────
create type tipo_lancamento   as enum ('despesa', 'receita', 'aporte');
create type situacao_lanc     as enum ('pago', 'a_pagar', 'recebido', 'a_receber', 'guardado');
create type tipo_categoria    as enum ('despesa', 'receita');
create type tipo_conta        as enum ('corrente', 'poupanca', 'investimento', 'dinheiro');
create type tipo_repeticao    as enum ('unica', 'parcelada', 'recorrente', 'assinatura');
create type frequencia        as enum ('semanal', 'quinzenal', 'mensal', 'semestral', 'anual', 'personalizado');
create type unidade_prazo     as enum ('dias', 'semanas', 'meses', 'anos');

-- ─────────────────────────────  Perfil  ────────────────────────────
create table perfis (
  id            uuid primary key references auth.users on delete cascade,
  nome          text not null default 'Você',
  tema          text not null default 'light',        -- 'light' | 'dark'
  cor_acento    text not null default '#93C9A8',
  cor_pessoal   text not null default '#A9A0D8',
  meta_destaque uuid,
  criado_em     timestamptz not null default now()
);

-- ─────────────────────────────  Contas  ────────────────────────────
create table contas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  nome        text not null,
  tipo        tipo_conta not null default 'corrente',
  cor         text not null default '#93B4D8',
  saldo_inicial numeric(14,2) not null default 0,
  varias      boolean not null default false,
  qtd_contas  smallint not null default 1,
  tem_debito  boolean not null default true,
  tem_credito boolean not null default false,
  tem_pix     boolean not null default true,
  arquivada   boolean not null default false,
  criado_em   timestamptz not null default now(),
  unique (user_id, nome)
);

create table cartoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  conta_id   uuid not null references contas on delete cascade,
  nome       text not null,
  bandeira   text not null default 'Mastercard',
  final      text,                                     -- 4 dígitos
  cor        text not null default '#8A05BE',
  limite     numeric(14,2) not null default 0,
  dia_fechamento smallint not null default 28 check (dia_fechamento between 1 and 31),
  dia_vencimento smallint not null default 5  check (dia_vencimento between 1 and 31),
  criado_em  timestamptz not null default now()
);

-- ──────────────────────  Categorias e subcategorias  ───────────────
create table categorias (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  nome       text not null,
  tipo       tipo_categoria not null default 'despesa',
  cor        text not null default '#93B4D8',
  cor_texto  text not null default '#14161a',
  ordem      smallint not null default 0,
  unique (user_id, nome)
);

create table subcategorias (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  categoria_id uuid not null references categorias on delete cascade,
  nome         text not null,
  unique (categoria_id, nome)
);

-- ───────────────────  Formas de pagamento (custom)  ────────────────
create table formas_pagamento (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  nome    text not null,
  padrao  boolean not null default false,   -- Débito, Crédito, Pix, Dinheiro
  unique (user_id, nome)
);

-- ─────────────────────────────  Metas  ─────────────────────────────
create table metas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  nome        text not null,
  alvo        numeric(14,2) not null check (alvo > 0),
  guardado    numeric(14,2) not null default 0,
  conta_id    uuid references contas on delete set null,
  aplicacao   text not null default 'Poupança',   -- Poupança, CDB, Tesouro, Ações
  tem_prazo   boolean not null default false,
  prazo_n     smallint,
  prazo_unidade unidade_prazo,
  criado_em   timestamptz not null default now()
);

alter table perfis
  add constraint perfis_meta_destaque_fk
  foreign key (meta_destaque) references metas on delete set null;

-- ───────────────────────────  Orçamentos  ──────────────────────────
create table orcamentos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  categoria_id uuid not null references categorias on delete cascade,
  limite       numeric(14,2) not null check (limite > 0),
  mes          date not null,          -- sempre dia 1 do mês de referência
  unique (user_id, categoria_id, mes)
);

-- ──────────────────────────  Lançamentos  ──────────────────────────
create table lancamentos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  tipo            tipo_lancamento not null,
  valor           numeric(14,2) not null check (valor > 0),   -- sempre positivo; o sinal vem do tipo
  descricao       text not null,
  data_registro   date not null,
  data_vencimento date,
  situacao        situacao_lanc not null default 'pago',
  categoria_id    uuid references categorias on delete set null,
  subcategoria_id uuid references subcategorias on delete set null,
  conta_id        uuid references contas on delete set null,
  cartao_id       uuid references cartoes on delete set null,
  forma_pagamento text,
  responsavel     text,
  observacao      text,
  meta_id         uuid references metas on delete set null,   -- preenchido quando tipo = 'aporte'
  -- série (parcelamento, recorrência, assinatura)
  serie_id        uuid,
  serie_tipo      tipo_repeticao,
  parcela_atual   smallint,
  parcela_total   smallint,
  -- conciliação bancária
  fitid           text,
  conciliado      boolean not null default false,
  importado       boolean not null default false,
  -- pendência do Registro Fácil
  incompleto      boolean not null default false,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (user_id, fitid)
);

create index lanc_user_data      on lancamentos (user_id, data_registro desc);
create index lanc_user_situacao  on lancamentos (user_id, situacao);
create index lanc_user_categoria on lancamentos (user_id, categoria_id);
create index lanc_user_cartao    on lancamentos (user_id, cartao_id, data_registro);
create index lanc_serie          on lancamentos (serie_id);
create index lanc_incompleto     on lancamentos (user_id) where incompleto;

-- Regras de integridade
alter table lancamentos add constraint aporte_tem_meta
  check (tipo <> 'aporte' or meta_id is not null);
alter table lancamentos add constraint parcela_coerente
  check (parcela_atual is null or parcela_atual <= parcela_total);

-- ───────────────────  Importações / conciliação  ───────────────────
create table importacoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  origem     text not null,             -- nome do arquivo ou URL
  formato    text not null,             -- 'ofx' | 'csv' | 'xlsx' | 'gsheets' | 'json'
  conta_id   uuid references contas on delete set null,
  total_linhas    integer not null default 0,
  total_conciliado integer not null default 0,
  total_criado     integer not null default 0,
  criado_em  timestamptz not null default now()
);

-- ─────────────────────  Atualização automática  ────────────────────
create or replace function touch_atualizado_em() returns trigger
language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;

create trigger lancamentos_touch before update on lancamentos
for each row execute function touch_atualizado_em();

-- Perfil criado junto com o usuário
create or replace function criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function criar_perfil();

-- Aporte mantém o guardado da meta em dia
create or replace function sincronizar_meta() returns trigger
language plpgsql as $$
begin
  if (tg_op = 'DELETE') then
    if old.tipo = 'aporte' then
      update metas set guardado = guardado - old.valor where id = old.meta_id;
    end if;
    return old;
  end if;
  if (tg_op = 'UPDATE' and old.tipo = 'aporte') then
    update metas set guardado = guardado - old.valor where id = old.meta_id;
  end if;
  if (new.tipo = 'aporte') then
    update metas set guardado = guardado + new.valor where id = new.meta_id;
  end if;
  return new;
end $$;

create trigger lancamentos_meta
after insert or update or delete on lancamentos
for each row execute function sincronizar_meta();
