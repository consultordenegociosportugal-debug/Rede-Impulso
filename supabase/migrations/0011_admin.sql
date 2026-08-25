-- ============================================================
-- Rede Impulso — painel de administração (revisão de documentos)
--
-- documentos_verificacao nunca teve policy de update de propósito
-- (migração 0002): aprovar/rejeitar é revisão humana, não o próprio
-- usuário. Isso cria as functions security definer que fazem esse
-- papel de "backend controlado" para quem for marcado como admin.
-- ============================================================

alter table profiles add column is_admin boolean not null default false;

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create policy "documentos_verificacao: admin le todos"
  on documentos_verificacao for select
  to authenticated
  using (public.is_admin());

create policy "profiles: admin le todos"
  on profiles for select
  to authenticated
  using (public.is_admin());

create policy "documentos-verificacao: admin le todos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documentos-verificacao' and public.is_admin());

-- Aprova/rejeita um documento específico.
create function public.revisar_documento(p_documento_id uuid, p_novo_status verification_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update documentos_verificacao set status = p_novo_status where id = p_documento_id;
end;
$$;

grant execute on function public.revisar_documento(uuid, verification_status) to authenticated;

-- Ajusta o status geral do perfil (feito à parte, depois de olhar
-- todos os documentos daquela pessoa — não tenta adivinhar sozinho
-- quais tipos de documento cada papel precisa).
create function public.revisar_perfil(p_profile_id uuid, p_novo_status verification_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update profiles set verification_status = p_novo_status where id = p_profile_id;
end;
$$;

grant execute on function public.revisar_perfil(uuid, verification_status) to authenticated;
