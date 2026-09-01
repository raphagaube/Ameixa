-- O seed original criava quatro bancos de exemplo (Nubank, Inter, Caixa,
-- Dinheiro). O app é entregue vazio: bancos são do usuário, não nossos.
-- Categorias, subcategorias e formas de pagamento continuam sendo semeadas,
-- porque digitar 11 categorias e ~50 subcategorias na mão seria cruel.

create or replace function semear_usuario(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into formas_pagamento (user_id, nome, padrao) values
    (p_user, 'Débito', true), (p_user, 'Crédito', true),
    (p_user, 'Pix', true),    (p_user, 'Dinheiro', true)
  on conflict do nothing;

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
end $$;
