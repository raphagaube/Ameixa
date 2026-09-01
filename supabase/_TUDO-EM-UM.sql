-- ============================================================
--  20260901000001_schema.sql
-- ============================================================
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


-- ============================================================
--  20260901000002_policies.sql
-- ============================================================
-- Ameixa · Row Level Security
-- Cada pessoa só enxerga e escreve os próprios dados. Perfis são isolados
-- mesmo compartilhando o aparelho.

alter table perfis            enable row level security;
alter table contas            enable row level security;
alter table cartoes           enable row level security;
alter table categorias        enable row level security;
alter table subcategorias     enable row level security;
alter table formas_pagamento  enable row level security;
alter table metas             enable row level security;
alter table orcamentos        enable row level security;
alter table lancamentos       enable row level security;
alter table importacoes       enable row level security;

-- Perfil: o dono é o próprio id
create policy "perfil proprio" on perfis
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Demais tabelas: dono por user_id
do $$
declare t text;
begin
  foreach t in array array['contas','cartoes','categorias','subcategorias',
                           'formas_pagamento','metas','orcamentos','lancamentos','importacoes']
  loop
    execute format($f$
      create policy "%1$s do dono" on %1$s
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;


-- ============================================================
--  20260901000003_functions.sql
-- ============================================================
-- Ameixa · funções de apoio e views de relatório

-- ── Geração de séries (parcelamento, recorrência, assinatura) ──────
-- Chame uma vez ao salvar; ela cria as ocorrências futuras já como
-- 'a_pagar' / 'a_receber'.
create or replace function gerar_serie(
  p_base        lancamentos,
  p_tipo        tipo_repeticao,
  p_freq        frequencia default 'mensal',
  p_ocorrencias integer default 1,
  p_ate         date default null
) returns setof lancamentos
language plpgsql security invoker as $$
declare
  passo interval;
  n integer;
  i integer := 0;
  d date;
  novo lancamentos;
  sid uuid := coalesce(p_base.serie_id, gen_random_uuid());
  desloc integer := coalesce(p_base.data_vencimento - p_base.data_registro, 0);
begin
  passo := case p_freq
    when 'semanal'    then interval '7 days'
    when 'quinzenal'  then interval '14 days'
    when 'semestral'  then interval '6 months'
    when 'anual'      then interval '12 months'
    else interval '1 month' end;

  n := case p_tipo
    when 'parcelada'  then coalesce(p_base.parcela_total, 1) - coalesce(p_base.parcela_atual, 1) + 1
    else greatest(p_ocorrencias, 1) end;

  loop
    d := p_base.data_registro + (passo * i);
    exit when (p_ate is not null and d > p_ate) or (p_ate is null and i >= n) or i > 240;

    novo := p_base;
    novo.id            := gen_random_uuid();
    novo.data_registro := d;
    novo.data_vencimento := d + desloc;
    novo.serie_id      := sid;
    novo.serie_tipo    := p_tipo;
    if p_tipo = 'parcelada' then
      novo.parcela_atual := coalesce(p_base.parcela_atual, 1) + i;
      novo.descricao := p_base.descricao || ' — ' || novo.parcela_atual || '/' || p_base.parcela_total;
    elsif p_tipo = 'assinatura' then
      novo.descricao := p_base.descricao || ' — assinatura ' || (i + 1) || '/' || n;
    end if;
    if d > current_date then
      novo.situacao := case when novo.tipo = 'receita' then 'a_receber'::situacao_lanc
                            else 'a_pagar'::situacao_lanc end;
    end if;

    insert into lancamentos values (novo.*) returning * into novo;
    return next novo;
    i := i + 1;
  end loop;
end $$;

-- ── Views de relatório ─────────────────────────────────────────────
-- Aportes em meta NUNCA entram em receita/despesa: o dinheiro só mudou de lugar.

create or replace view v_movimento_mensal as
select user_id,
       date_trunc('month', data_registro)::date as mes,
       sum(valor) filter (where tipo = 'receita') as receitas,
       sum(valor) filter (where tipo = 'despesa') as despesas,
       sum(valor) filter (where tipo = 'receita')
         - coalesce(sum(valor) filter (where tipo = 'despesa'), 0) as resultado,
       count(*) as lancamentos
from lancamentos
where tipo <> 'aporte'
group by user_id, mes;

create or replace view v_gasto_por_categoria as
select l.user_id,
       date_trunc('month', l.data_registro)::date as mes,
       c.id as categoria_id, c.nome as categoria, c.cor, c.cor_texto,
       sum(l.valor) as total
from lancamentos l
left join categorias c on c.id = l.categoria_id
where l.tipo = 'despesa'
group by l.user_id, mes, c.id, c.nome, c.cor, c.cor_texto;

create or replace view v_orcamento_status as
select o.user_id, o.mes, o.categoria_id, c.nome as categoria, o.limite,
       coalesce(g.total, 0) as gasto,
       round(coalesce(g.total, 0) / o.limite * 100) as percentual,
       case when coalesce(g.total, 0) >= o.limite then 'ultrapassou'
            when coalesce(g.total, 0) >= o.limite * 0.8 then 'quase'
            else 'ok' end as estado
from orcamentos o
join categorias c on c.id = o.categoria_id
left join v_gasto_por_categoria g
  on g.categoria_id = o.categoria_id and g.mes = o.mes and g.user_id = o.user_id;

create or replace view v_fatura_cartao as
select l.user_id, l.cartao_id, k.nome as cartao, k.limite,
       date_trunc('month', l.data_registro)::date as mes,
       sum(l.valor) as fatura,
       k.limite - sum(l.valor) as disponivel,
       round(sum(l.valor) / nullif(k.limite, 0) * 100) as uso
from lancamentos l
join cartoes k on k.id = l.cartao_id
where l.tipo = 'despesa'
group by l.user_id, l.cartao_id, k.nome, k.limite, mes;


-- ============================================================
--  20260901000004_seed.sql
-- ============================================================
-- Ameixa · dados iniciais por usuário
-- Chame depois do primeiro login: select semear_usuario(auth.uid());

create or replace function semear_usuario(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cat uuid;
begin
  -- formas de pagamento padrão
  insert into formas_pagamento (user_id, nome, padrao) values
    (p_user, 'Débito', true), (p_user, 'Crédito', true),
    (p_user, 'Pix', true),    (p_user, 'Dinheiro', true)
  on conflict do nothing;

  -- categorias de despesa
  insert into categorias (user_id, nome, tipo, cor, cor_texto, ordem) values
    (p_user, 'Moradia',      'despesa', '#8FB3D9', '#14161a', 1),
    (p_user, 'Alimentação',  'despesa', '#E9A28E', '#14161a', 2),
    (p_user, 'Transporte',   'despesa', '#A9A0D8', '#14161a', 3),
    (p_user, 'Saúde',        'despesa', '#8FCFC4', '#14161a', 4),
    (p_user, 'Lazer',        'despesa', '#E7A8C4', '#14161a', 5),
    (p_user, 'Pessoal',      'despesa', '#E3C879', '#14161a', 6),
    (p_user, 'Assinaturas',  'despesa', '#BDA8E0', '#14161a', 7),
    (p_user, 'Educação',     'despesa', '#8FC9E0', '#14161a', 8),
    (p_user, 'Salário',      'receita', '#93C9A8', '#14161a', 9),
    (p_user, 'Freelance',    'receita', '#9FC58F', '#14161a', 10),
    (p_user, 'Investimentos','receita', '#7FBFA6', '#14161a', 11)
  on conflict do nothing;

  -- subcategorias
  perform sub(p_user, 'Moradia',      array['Aluguel','Condomínio','Luz','Água','Internet','Gás','IPTU']);
  perform sub(p_user, 'Alimentação',  array['Supermercado','Restaurantes','Delivery','Padaria','Café','Feira']);
  perform sub(p_user, 'Transporte',   array['Combustível','Aplicativo','Ônibus/Metrô','Estacionamento','Manutenção','IPVA']);
  perform sub(p_user, 'Saúde',        array['Farmácia','Consultas','Plano de saúde','Academia','Exames']);
  perform sub(p_user, 'Lazer',        array['Streaming','Cinema','Bares','Viagens','Jogos','Shows']);
  perform sub(p_user, 'Pessoal',      array['Roupas','Cabelo','Presentes','Eletrônicos','Pets']);
  perform sub(p_user, 'Assinaturas',  array['Streaming','Software','Academia','Nuvem']);
  perform sub(p_user, 'Educação',     array['Cursos','Livros','Mensalidade']);
  perform sub(p_user, 'Salário',      array['Salário fixo','13º','Férias','Bônus']);
  perform sub(p_user, 'Freelance',    array['Design','Consultoria','Outros']);
  perform sub(p_user, 'Investimentos',array['Rendimentos','Dividendos','Resgate']);

  -- bancos de exemplo (remova se não quiser)
  insert into contas (user_id, nome, tipo, cor, tem_credito) values
    (p_user, 'Nubank', 'corrente',  '#8A05BE', true),
    (p_user, 'Inter',  'poupanca',  '#FF7A00', true),
    (p_user, 'Caixa',  'corrente',  '#1C5CA8', false),
    (p_user, 'Dinheiro','dinheiro', '#6E7B72', false)
  on conflict do nothing;
end $$;

create or replace function sub(p_user uuid, p_cat text, p_subs text[])
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from categorias where user_id = p_user and nome = p_cat;
  if cid is null then return; end if;
  insert into subcategorias (user_id, categoria_id, nome)
  select p_user, cid, unnest(p_subs)
  on conflict do nothing;
end $$;


