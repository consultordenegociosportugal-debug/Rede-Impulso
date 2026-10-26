-- Rede Impulso — CPF do corretor. A home já promete "Só CPF e CRECI" no
-- cadastro, mas o campo nunca existiu no banco. Guardado em corretor_perfis
-- (mesmo lugar do CRECI/bairros/cidade), não em profiles, porque só
-- corretor preenche.

alter table corretor_perfis add column if not exists cpf text;

-- O trigger de signup (0057) ainda não sabia gravar CPF — sem isso, o
-- metadado viria no signUp mas nunca chegaria em corretor_perfis.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  v_role user_role;
  v_role_texto text := nullif(trim(meta->>'role'), '');
  v_nome text;
  v_data_nascimento date;
  v_cidade text;
begin
  if v_role_texto is not null
     and exists (
       select 1 from unnest(enum_range(null::user_role)) as r
       where r::text = v_role_texto
     )
  then
    v_role := v_role_texto::user_role;
  else
    v_role := 'comprador';
  end if;

  v_nome := coalesce(
    nullif(trim(meta->>'nome'), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    ''
  );

  v_cidade := nullif(trim(coalesce(meta->>'cidade', '')), '');

  begin
    v_data_nascimento := nullif(meta->>'data_nascimento', '')::date;
    if v_data_nascimento is not null
       and v_data_nascimento > current_date - interval '18 years'
    then
      v_data_nascimento := null;
    end if;
  exception when others then
    v_data_nascimento := null;
  end;

  insert into public.profiles (
    id, role, nome, telefone, email, rede_social, foto_url, termos_aceitos_em, data_nascimento
  )
  values (
    new.id,
    v_role,
    v_nome,
    nullif(trim(coalesce(meta->>'telefone', '')), ''),
    new.email,
    nullif(meta->>'rede_social', ''),
    nullif(coalesce(meta->>'avatar_url', meta->>'picture'), ''),
    now(),
    v_data_nascimento
  )
  on conflict (id) do nothing;

  if v_role = 'corretor' then
    insert into public.corretor_perfis (profile_id, creci, bairros_atuacao, cidade, cpf)
    values (
      new.id,
      coalesce(meta->>'creci', ''),
      case
        when jsonb_exists(meta, 'bairros_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'bairros_atuacao'))
        else '{}'::text[]
      end,
      v_cidade,
      nullif(trim(coalesce(meta->>'cpf', '')), '')
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is 'Cria a linha em profiles (e em corretor_perfis, se for o papel) a partir dos metadados do signUp ou do provedor OAuth. Sem role/nome (login social) cai para comprador.';
