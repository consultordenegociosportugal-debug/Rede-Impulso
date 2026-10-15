-- ============================================================
-- Rede Impulso — cidade de atuação do profissional
--
-- Levantamento na área "Buscar" do cliente no AppBarber
-- (sites.appbarber.com.br): tem 3 jeitos de achar um estabelecimento —
-- por nome, por cidade, ou "próximas" (geolocalização do navegador).
-- Pra fazer o mesmo aqui — buscar corretor/imobiliária/construtora —
-- precisamos da cidade de atuação de cada um, que não existia em
-- nenhuma das três extensões de perfil.
--
-- Não temos endereço/lat-lng do profissional (diferente do imóvel, que
-- já tem LocalizacaoImovel) — "Próximas" na nossa versão compara a
-- cidade detectada por geolocalização + geocodificação reversa contra
-- esse campo, não a distância em km como o AppBarber faz. É uma
-- aproximação honesta dado o que já temos modelado.
-- ============================================================

alter table corretor_perfis add column cidade text;
alter table imobiliaria_perfis add column cidade text;
alter table construtora_perfis add column cidade text;

comment on column corretor_perfis.cidade is 'Cidade principal de atuação — usada na busca "próximas" (geolocalização por cidade, não distância).';
comment on column imobiliaria_perfis.cidade is 'Cidade principal de atuação — usada na busca "próximas" (geolocalização por cidade, não distância).';
comment on column construtora_perfis.cidade is 'Cidade principal de atuação — usada na busca "próximas" (geolocalização por cidade, não distância).';

-- Trigger de criação de profile passa a gravar a cidade também, quando
-- vier no metadata do signUp().
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
    insert into public.corretor_perfis (profile_id, creci, bairros_atuacao, cidade)
    values (
      new.id,
      coalesce(meta->>'creci', ''),
      case
        when jsonb_exists(meta, 'bairros_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'bairros_atuacao'))
        else '{}'::text[]
      end,
      v_cidade
    )
    on conflict (profile_id) do nothing;
  elsif v_role = 'imobiliaria' then
    insert into public.imobiliaria_perfis (profile_id, cnpj, nome_fantasia, cidade)
    values (
      new.id,
      coalesce(meta->>'cnpj', ''),
      coalesce(meta->>'nome_fantasia', ''),
      v_cidade
    )
    on conflict (profile_id) do nothing;
  elsif v_role = 'construtora' then
    insert into public.construtora_perfis (profile_id, cnpj, nome_fantasia, cidade)
    values (
      new.id,
      coalesce(meta->>'cnpj', ''),
      coalesce(meta->>'nome_fantasia', ''),
      v_cidade
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is 'Cria a linha em profiles (e na extensao de papel) a partir dos metadados do signUp ou do provedor OAuth — roda com security definer porque o usuario ainda nao tem sessao ate confirmar o email. Sem role/nome (login social) cai para comprador e para o nome vindo do provedor. data_nascimento so e gravada se corresponder a 18 anos ou mais. construtora usa a mesma extensao de cnpj/nome_fantasia de imobiliaria. cidade e opcional nas tres extensoes de papel profissional.';
