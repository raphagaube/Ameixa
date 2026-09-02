-- Ameixa · mais formas de pagamento
--
-- Faltavam as maneiras de pagar que mais aparecem numa conta brasileira
-- depois do Pix: boleto, carteira digital, TED/DOC, link de pagamento e QR
-- Code. Sem elas, quem paga um boleto tinha que escolher "Débito" ou deixar
-- em branco, e o relatório perdia a informação.

-- A lista num lugar só, para acrescentar a próxima sem mexer na semeadura
-- inteira.
--
-- `padrao` aqui quer dizer "aparece primeiro na lista", e é a única coisa
-- que o app lê desta coluna (src/lib/dados/apoio.ts ordena por ela). As
-- quatro do dia a dia ficam no topo; as outras vêm logo abaixo, em ordem
-- alfabética. Num formulário de celular, ordem é usabilidade.
create or replace function semear_formas_pagamento(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into formas_pagamento (user_id, nome, padrao) values
    (p_user, 'Pix',               true),
    (p_user, 'Débito',            true),
    (p_user, 'Crédito',           true),
    (p_user, 'Dinheiro',          true),
    (p_user, 'Boleto',            false),
    (p_user, 'Carteira digital',  false),
    (p_user, 'TED/DOC',           false),
    (p_user, 'Link de pagamento', false),
    (p_user, 'QR Code',           false)
  on conflict (user_id, nome) do nothing;
end $$;

-- Quem já usa o app não passa mais pela semeadura: ela roda uma vez, no
-- primeiro acesso. Sem este preenchimento, as formas novas só existiriam
-- para contas criadas de agora em diante.
do $$
declare u uuid;
begin
  for u in
    select distinct user_id from formas_pagamento
  loop
    perform semear_formas_pagamento(u);
  end loop;
end $$;

-- A semeadura passa a delegar as formas de pagamento. O resto do corpo é o
-- mesmo de 20260901000004_seed.sql: só o primeiro bloco mudou.
create or replace function semear_usuario(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform semear_formas_pagamento(p_user);

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
