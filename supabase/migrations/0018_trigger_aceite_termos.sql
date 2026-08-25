-- Registra o momento do aceite dos Termos/Privacidade no cadastro.
-- O formulário exige o checkbox marcado antes de chamar signUp(), então
-- todo novo profile já passou por esse aceite no momento do insert.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  v_role user_role;
begin
  v_role := coalesce((meta->>'role')::user_role, 'comprador');

  insert into public.profiles (id, role, nome, telefone, email, rede_social, termos_aceitos_em)
  values (
    new.id,
    v_role,
    coalesce(meta->>'nome', ''),
    meta->>'telefone',
    new.email,
    nullif(meta->>'rede_social', ''),
    now()
  );

  if v_role = 'corretor' then
    insert into public.corretor_perfis (profile_id, creci, bairros_atuacao)
    values (
      new.id,
      coalesce(meta->>'creci', ''),
      case
        when jsonb_exists(meta, 'bairros_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'bairros_atuacao'))
        else '{}'::text[]
      end
    );
  elsif v_role = 'imobiliaria' then
    insert into public.imobiliaria_perfis (profile_id, cnpj, nome_fantasia)
    values (
      new.id,
      coalesce(meta->>'cnpj', ''),
      coalesce(meta->>'nome_fantasia', '')
    );
  end if;

  return new;
end;
$$;
