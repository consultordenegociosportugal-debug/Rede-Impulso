-- ============================================================
-- Rede Impulso — admin promove/revoga outros admins
--
-- Mesmo cuidado da migração 0072: is_admin nunca pode ter um caminho
-- de escrita aberto pra `authenticated` (senão qualquer um se
-- autopromove). Essa function é a única via legítima de mudar
-- is_admin pela aplicação a partir de agora — security definer, só
-- quem já é admin pode chamar, e nunca deixa zerar o último admin
-- (senão a conta trava sem ninguém pra reabrir acesso).
create function public.definir_admin(p_profile_id uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if not p_admin and (select count(*) from profiles where is_admin) <= 1 then
    raise exception 'não é possível remover o último administrador';
  end if;

  update profiles set is_admin = p_admin where id = p_profile_id;
end;
$$;

grant execute on function public.definir_admin(uuid, boolean) to authenticated;
