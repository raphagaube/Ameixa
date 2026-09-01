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
