-- Guardar só os ids das agendas, sem mexer no resto da conexão.
--
-- Existe porque a agenda pode sumir do lado do Google — o dono apaga sem
-- querer, ou reorganiza a conta. Quando isso acontece o app precisa recriar
-- e anotar os ids novos, e não faz sentido exigir uma reconexão inteira
-- (com consentimento e tudo) para atualizar dois campos.
create or replace function public.agenda_gravar_agendas(
  p_pagar   text,
  p_receber text
) returns void
language sql security definer set search_path = privado, public, pg_temp
as $$
  update privado.agenda_google
     set agenda_pagar_id = coalesce(p_pagar, agenda_pagar_id),
         agenda_receber_id = coalesce(p_receber, agenda_receber_id)
   where user_id = auth.uid();
$$;

revoke all on function public.agenda_gravar_agendas(text,text) from anon;
