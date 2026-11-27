-- ============================================================
-- Rede Impulso — agregação de "oportunidades de gestor" no Postgres
--
-- /admin/oportunidades-gestor buscava corretor_perfis e visitas
-- inteiros pra agregar em JavaScript (contagem de corretor e de
-- visita por organização) — function abaixo faz essa conta no banco
-- com group by, e substitui o uso da service role naquela página
-- (security definer, mesmo molde de revisar_perfil/revisar_documento,
-- migração 0011): visitas não tem policy de leitura pra admin
-- (migrações 0020/0048/0056/0057), por isso a function.
-- ============================================================

create function public.oportunidades_gestor()
returns table (
  organizacao_id uuid,
  total_corretores bigint,
  total_visitas bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select
      cp.organizacao_catalogo_id,
      count(distinct cp.profile_id),
      count(v.id)
    from corretor_perfis cp
    left join visitas v on v.corretor_id = cp.profile_id
    where cp.organizacao_catalogo_id is not null
      and not exists (
        select 1 from gestor_perfis gp where gp.organizacao_catalogo_id = cp.organizacao_catalogo_id
      )
    group by cp.organizacao_catalogo_id;
end;
$$;

grant execute on function public.oportunidades_gestor() to authenticated;
