-- Ameixa · integração com o Google Agenda
--
-- Cada conta a pagar ou a receber vira compromisso em uma de duas agendas
-- criadas pelo próprio app, com lembrete um dia antes.

-- ── Limpeza do caminho abandonado ──────────────────────────────────
-- Chegamos a desenhar isto como um endereço .ics que o Google assinaria.
-- O Google relê listas assinadas quando quer, às vezes só no dia seguinte,
-- então trocamos pela API. A chave do endereço não serve mais.
drop index if exists perfis_token_agenda;
alter table perfis drop column if exists token_agenda;

-- ── Onde mora o refresh token ──────────────────────────────────────
-- Duas travas, e as duas são necessárias.
--
-- A primeira é este schema, fora de `public` e não exposto ao PostgREST:
-- sem ele, `auth.uid() = user_id` não bastaria, porque a chave publicável
-- está no bundle do navegador e um fetch em /rest/v1/ leria o token.
--
-- A segunda é a cifragem. O schema privado sozinho também não basta: o
-- servidor da Ameixa fala com o banco como `authenticated`, o mesmo papel
-- do navegador, então toda função que o servidor chama o navegador também
-- chama. Por isso o refresh token entra e sai daqui SEMPRE cifrado, com
-- uma chave que só existe nas variáveis de ambiente. Quem chamar a RPC do
-- console do navegador leva um texto embaralhado que não serve para nada.
create schema if not exists privado;
revoke all on schema privado from anon, authenticated;

create table privado.agenda_google (
  user_id           uuid primary key references auth.users on delete cascade,
  refresh_cifrado   text not null,   -- AES-256-GCM; a chave vive na Vercel
  access_cifrado    text,           -- idem; dura uma hora, mas é credencial
  access_expira_em  timestamptz,
  agenda_pagar_id   text,
  agenda_receber_id text,
  email_google      text,
  escopos           text,
  -- 'ok' | 'reconectar'. O segundo é o estado em que o Google recusou o
  -- refresh token: pare de tentar e avise na tela.
  estado            text not null default 'ok',
  ultima_falha      text,
  conectado_em      timestamptz not null default now()
);

revoke all on privado.agenda_google from anon, authenticated;

-- ── Portas de entrada ──────────────────────────────────────────────
-- Nenhuma delas recebe user_id por parâmetro: quem chama não escolhe de
-- quem são as credenciais. É o que impede um usuário de ler o token do
-- outro passando um id qualquer.

create or replace function public.agenda_credenciais()
returns privado.agenda_google
language sql security definer set search_path = privado, public, pg_temp
stable as $$
  select * from privado.agenda_google where user_id = auth.uid();
$$;

create or replace function public.agenda_gravar(
  p_refresh   text,   -- já cifrado pelo servidor
  p_access    text,   -- já cifrado pelo servidor
  p_expira    timestamptz,
  p_email     text,
  p_escopos   text,
  p_pagar     text,
  p_receber   text
) returns void
language plpgsql security definer set search_path = privado, public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;

  insert into privado.agenda_google as a (
    user_id, refresh_cifrado, access_cifrado, access_expira_em,
    email_google, escopos, agenda_pagar_id, agenda_receber_id,
    estado, ultima_falha, conectado_em
  ) values (
    auth.uid(), p_refresh, p_access, p_expira,
    p_email, p_escopos, p_pagar, p_receber,
    'ok', null, now()
  )
  on conflict (user_id) do update set
    -- Reconexão pode não trazer refresh novo; manter o antigo é melhor
    -- que gravar nulo e derrubar a integração.
    refresh_cifrado   = coalesce(excluded.refresh_cifrado, a.refresh_cifrado),
    access_cifrado    = excluded.access_cifrado,
    access_expira_em  = excluded.access_expira_em,
    email_google      = coalesce(excluded.email_google, a.email_google),
    escopos           = excluded.escopos,
    agenda_pagar_id   = coalesce(excluded.agenda_pagar_id, a.agenda_pagar_id),
    agenda_receber_id = coalesce(excluded.agenda_receber_id, a.agenda_receber_id),
    estado            = 'ok',
    ultima_falha      = null,
    conectado_em      = now();
end $$;

-- Guarda o access token renovado sem mexer no resto.
create or replace function public.agenda_gravar_access(
  p_access text,
  p_expira timestamptz
) returns void
language sql security definer set search_path = privado, public, pg_temp
as $$
  update privado.agenda_google
     set access_cifrado = p_access, access_expira_em = p_expira
   where user_id = auth.uid();
$$;

create or replace function public.agenda_marcar_estado(
  p_estado text,
  p_falha  text default null
) returns void
language sql security definer set search_path = privado, public, pg_temp
as $$
  update privado.agenda_google
     set estado = p_estado,
         ultima_falha = p_falha,
         -- Perdeu a validade: o access token em cache também não vale mais.
         access_cifrado = case when p_estado = 'reconectar' then null else access_cifrado end
   where user_id = auth.uid();
$$;

create or replace function public.agenda_desconectar()
returns void
language sql security definer set search_path = privado, public, pg_temp
as $$
  delete from privado.agenda_google where user_id = auth.uid();
$$;

-- Status para a tela: tudo que o Ajustes precisa, e nada de segredo.
create or replace function public.agenda_status()
returns table (
  conectado    boolean,
  estado       text,
  email_google text,
  agenda_pagar_id   text,
  agenda_receber_id text,
  ultima_falha text,
  conectado_em timestamptz
)
language sql security definer set search_path = privado, public, pg_temp
stable as $$
  select true, a.estado, a.email_google, a.agenda_pagar_id,
         a.agenda_receber_id, a.ultima_falha, a.conectado_em
    from privado.agenda_google a
   where a.user_id = auth.uid();
$$;

revoke all on function public.agenda_credenciais() from anon;
revoke all on function public.agenda_gravar(text,text,timestamptz,text,text,text,text) from anon;
revoke all on function public.agenda_gravar_access(text,timestamptz) from anon;
revoke all on function public.agenda_marcar_estado(text,text) from anon;
revoke all on function public.agenda_desconectar() from anon;
revoke all on function public.agenda_status() from anon;

-- ── Vínculo lançamento → evento ────────────────────────────────────
-- Tabela separada, e não coluna em `lancamentos`, por três motivos:
-- o trigger `lancamentos_touch` sujaria `atualizado_em` de todo lançamento
-- sincronizado; `CAMPOS` (src/lib/dados/lancamentos.ts) é o select quente de
-- toda listagem e não precisa carregar isto; e `assinatura` deixa pular o
-- PATCH quando nada que aparece no evento mudou.
create table eventos_agenda (
  lancamento_id   uuid primary key references lancamentos on delete cascade,
  user_id         uuid not null references auth.users on delete cascade,
  calendario_id   text not null,
  evento_id       text not null,
  assinatura      text not null,
  sincronizado_em timestamptz not null default now(),
  unique (user_id, calendario_id, evento_id)
);

create index eventos_agenda_user on eventos_agenda (user_id);

-- ── Fila de saída ──────────────────────────────────────────────────
-- Para o que não pode ser síncrono: importação de planilha, organização em
-- massa de pendências, e qualquer coisa que o Google recusou na hora.
create table fila_agenda (
  id                bigserial primary key,
  user_id           uuid not null references auth.users on delete cascade,
  -- Sem foreign key de propósito: a linha precisa sobreviver à exclusão do
  -- lançamento, senão o evento fica órfão na agenda para sempre.
  lancamento_id     uuid,
  acao              text not null check (acao in ('salvar', 'apagar')),
  -- Para 'apagar': {calendario_id, evento_id}. O lançamento já não existe.
  carga             jsonb,
  tentativas        smallint not null default 0,
  proxima_tentativa timestamptz not null default now(),
  erro              text,
  criado_em         timestamptz not null default now()
);

create index fila_agenda_a_fazer
  on fila_agenda (user_id, proxima_tentativa);

alter table eventos_agenda enable row level security;
alter table fila_agenda    enable row level security;

create policy "eventos_agenda do dono" on eventos_agenda
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "fila_agenda do dono" on fila_agenda
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
