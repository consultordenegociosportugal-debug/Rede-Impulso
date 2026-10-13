-- ============================================================
-- Rede Impulso — verificação de idade no cadastro (ECA Digital + LGPD)
--
-- Até aqui não existia NENHUM campo de idade — zero verificação, nem
-- autodeclaração. O ECA Digital (Lei 15.211/2025) exige mecanismo
-- razoável de verificação de idade, não só uma caixinha "declaro que
-- sou maior de idade". Aqui a barra razoável para uma plataforma de
-- marketplace (não voltada a crianças) é: pedir a data de nascimento
-- de verdade (não um checkbox) e bloquear o cadastro de menor de 18 —
-- a Rede Impulso fecha negócio e contrato, exige capacidade civil.
--
-- `data_nascimento` nasce NULLABLE porque:
--   1. Perfis já existentes não têm esse dado e não dá pra inventar.
--   2. O fluxo de login social (handle_new_user, ver 0021) cria o
--      profile ANTES de pedir qualquer dado adicional — a idade só
--      chega depois, em /completar-cadastro, via UPDATE.
-- O check constraint permite NULL (perfil "ainda não informou"), mas
-- se um valor for gravado, tem que corresponder a 18 anos ou mais —
-- ninguém consegue contornar a validação do formulário gravando uma
-- data de nascimento de menor direto no banco.
-- ============================================================

alter table profiles add column data_nascimento date;

alter table profiles add constraint profiles_maior_idade
  check (data_nascimento is null or data_nascimento <= current_date - interval '18 years');

comment on column profiles.data_nascimento is 'Autodeclarada no cadastro. Mecanismo de verificação de idade exigido pelo ECA Digital — bloqueia (via constraint) qualquer valor correspondente a menor de 18 anos.';

-- Atualiza o trigger de criação de profile para também gravar
-- data_nascimento quando vier no metadata do signUp() (cadastro por
-- e-mail/senha já manda; login social não manda nada aqui — completa
-- depois em /completar-cadastro).
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

  -- Data inválida ou de menor de idade simplesmente não é gravada
  -- (fica null) em vez de abortar a criação do usuário — a validação
  -- "dura" de bloqueio já aconteceu no formulário antes do signUp();
  -- isso aqui é só para não deixar o trigger inteiro falhar por um
  -- valor malformado vindo de fora do formulário.
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
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is 'Cria a linha em profiles (e na extensao de papel) a partir dos metadados do signUp ou do provedor OAuth — roda com security definer porque o usuario ainda nao tem sessao ate confirmar o email. Sem role/nome (login social) cai para comprador e para o nome vindo do provedor. data_nascimento so e gravada se corresponder a 18 anos ou mais.';
