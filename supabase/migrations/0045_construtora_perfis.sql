-- ============================================================
-- Rede Impulso — perfil de Construtora/Incorporadora
--
-- Mesma extensão 1:1 que imobiliaria_perfis (CNPJ + nome fantasia) —
-- uma construtora publica empreendimentos usando as mesmas ferramentas
-- de anúncio que já existem (publicar-imovel, planos, destaque); não
-- criamos um modelo de "empreendimento com várias unidades" nesta
-- leva — fica para quando o produto precisar mesmo disso.
-- ============================================================

create table construtora_perfis (
  profile_id uuid primary key references profiles (id) on delete cascade,
  cnpj text not null,
  nome_fantasia text not null,
  created_at timestamptz not null default now()
);

comment on table construtora_perfis is 'Extensão 1:1 de profiles para o papel construtora — mesmo modelo de imobiliaria_perfis.';

alter table construtora_perfis enable row level security;

create policy "construtora_perfis: leitura publica"
  on construtora_perfis for select
  to anon, authenticated
  using (true);

create policy "construtora_perfis: dono gerencia o proprio"
  on construtora_perfis for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Atualiza o trigger de criação de profile para também abrir a
-- extensão de papel quando role = 'construtora' (mesmo tratamento que
-- corretor/imobiliaria já tinham).
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
    insert into public.corretor_perfis (profile_id, creci, bairros_atuacao)
    values (
      new.id,
      coalesce(meta->>'creci', ''),
      case
        when jsonb_exists(meta, 'bairros_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'bairros_atuacao'))
        else '{}'::text[]
      end
    )
    on conflict (profile_id) do nothing;
  elsif v_role = 'imobiliaria' then
    insert into public.imobiliaria_perfis (profile_id, cnpj, nome_fantasia)
    values (
      new.id,
      coalesce(meta->>'cnpj', ''),
      coalesce(meta->>'nome_fantasia', '')
    )
    on conflict (profile_id) do nothing;
  elsif v_role = 'construtora' then
    insert into public.construtora_perfis (profile_id, cnpj, nome_fantasia)
    values (
      new.id,
      coalesce(meta->>'cnpj', ''),
      coalesce(meta->>'nome_fantasia', '')
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is 'Cria a linha em profiles (e na extensao de papel) a partir dos metadados do signUp ou do provedor OAuth — roda com security definer porque o usuario ainda nao tem sessao ate confirmar o email. Sem role/nome (login social) cai para comprador e para o nome vindo do provedor. data_nascimento so e gravada se corresponder a 18 anos ou mais. construtora usa a mesma extensao de cnpj/nome_fantasia de imobiliaria.';
