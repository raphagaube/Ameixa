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
