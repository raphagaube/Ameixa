-- Aditiva: preserva cores, categorias e todos os vínculos do histórico.
alter table public.categorias
  add column if not exists icone text,
  add column if not exists cor_texto_modo text;

alter table public.categorias
  add constraint categorias_icone_valido check (
    icone is null or icone ~ '^(00[1-9]|0[1-9][0-9]|1[01][0-9]|120)$'
  ),
  add constraint categorias_cor_texto_modo_valido check (
    cor_texto_modo is null or cor_texto_modo in ('auto', 'branco', 'preto')
  );

comment on column public.categorias.icone is 'Identificador do ícone original (001–120); null mantém a categoria sem ícone.';
comment on column public.categorias.cor_texto_modo is 'Escolha de contraste do texto e ícone. null preserva a cor de categorias anteriores.';
