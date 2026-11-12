-- Corretor pode atuar em mais de uma cidade (ou estado inteiro) —
-- comum para quem tem CRECI em mais de um estado do Brasil. Troca a
-- coluna única `cidade` por um array `cidades_atuacao`, no mesmo
-- padrão já usado por `bairros_atuacao`.
--
-- handle_new_user() é reescrita com base na versão atual (0059), só
-- trocando a coluna `cidade`/v_cidade por `cidades_atuacao` — mantém
-- CPF, data_nascimento, rede_social, foto_url etc. intactos.

alter table corretor_perfis
  add column cidades_atuacao text[] not null default '{}';

update corretor_perfis
  set cidades_atuacao = array[cidade]
  where cidade is not null and cidade <> '';

alter table corretor_perfis drop column cidade;

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
    insert into public.corretor_perfis (profile_id, creci, bairros_atuacao, cidades_atuacao, cpf)
    values (
      new.id,
      coalesce(meta->>'creci', ''),
      case
        when jsonb_exists(meta, 'bairros_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'bairros_atuacao'))
        else '{}'::text[]
      end,
      case
        when jsonb_exists(meta, 'cidades_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'cidades_atuacao'))
        else '{}'::text[]
      end,
      nullif(trim(coalesce(meta->>'cpf', '')), '')
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is 'Cria a linha em profiles (e em corretor_perfis, se for o papel) a partir dos metadados do signUp ou do provedor OAuth. Sem role/nome (login social) cai para comprador.';

-- Busca de corretor por cidade/estado: PostgREST não faz ILIKE parcial
-- contra elementos de um text[] diretamente, então vira uma RPC com
-- unnest(), já retornando nome/foto_url (evita um round trip extra).
create or replace function public.buscar_corretores_por_cidade(termo text)
returns table (
  profile_id uuid,
  creci text,
  cidades_atuacao text[],
  nome text,
  foto_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select cp.profile_id, cp.creci, cp.cidades_atuacao, p.nome, p.foto_url
  from corretor_perfis cp
  join profiles p on p.id = cp.profile_id
  where exists (
    select 1 from unnest(cp.cidades_atuacao) as c where c ilike '%' || termo || '%'
  )
  limit 12;
$$;

grant execute on function public.buscar_corretores_por_cidade(text) to anon, authenticated;
