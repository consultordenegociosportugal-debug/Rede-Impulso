-- ============================================================
-- Rede Impulso — cadastro por login social (Google / Facebook)
--
-- supabase.auth.signInWithOAuth() cria a linha em auth.users com um
-- raw_user_meta_data montado pelo PROVEDOR, não pelo nosso formulário.
-- Google e Facebook mandam algo como:
--   { "email": "...", "full_name": "...", "name": "...",
--     "avatar_url": "...", "picture": "...", "provider_id": "..." }
-- Ou seja: não vem `role`, não vem `nome` e não vem `telefone` — as
-- três chaves em que o trigger de 0003/0018 se apoiava.
--
-- O que muda aqui:
--   * `nome` passa a cair para full_name -> name -> parte local do
--     e-mail, em vez de virar string vazia (a coluna é not null, e um
--     perfil sem nome nenhum não aparece direito em lugar nenhum).
--   * `role` continua caindo para 'comprador' — é o papel que não
--     exige documento de verificação (TIPOS_POR_ROLE em
--     src/lib/verificacao.ts lista [] para comprador), então é o
--     default seguro: ninguém ganha acesso a nada só por entrar com
--     o Google. O cast agora é protegido contra um valor inválido
--     no metadata, que antes derrubaria o insert em auth.users.
--   * `foto_url` aproveita o avatar do provedor quando existir.
--   * `telefone` continua NULO nesse caminho. A coluna já nasceu
--     nullable em 0001_init.sql, então NÃO foi preciso alterá-la —
--     é justamente a ausência de telefone que a aplicação usa como
--     sinal de "cadastro incompleto" e manda o usuário para
--     /completar-cadastro logo depois do login social.
--
-- `on conflict (id) do nothing` protege o caso de o trigger rodar
-- para um usuário que já tem profile (vinculação de identidade,
-- quando o mesmo e-mail entra por senha e depois pelo Google).
--
-- O fluxo de e-mail/senha não muda em nada: quando `role`, `nome` e
-- `telefone` vêm no metadata do signUp(), eles continuam ganhando.
-- ============================================================

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
begin
  -- Cast protegido: um `role` ausente (login social) ou desconhecido
  -- cai para 'comprador' em vez de abortar a criação do usuário.
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

  -- `nome` do nosso formulário; senão o nome que o provedor OAuth
  -- mandou; senão a parte local do e-mail, para nunca ficar vazio.
  v_nome := coalesce(
    nullif(trim(meta->>'nome'), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    ''
  );

  insert into public.profiles (
    id, role, nome, telefone, email, rede_social, foto_url, termos_aceitos_em
  )
  values (
    new.id,
    v_role,
    v_nome,
    nullif(trim(coalesce(meta->>'telefone', '')), ''),
    new.email,
    nullif(meta->>'rede_social', ''),
    nullif(coalesce(meta->>'avatar_url', meta->>'picture'), ''),
    now()
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

comment on function public.handle_new_user() is 'Cria a linha em profiles (e na extensao de papel) a partir dos metadados do signUp ou do provedor OAuth — roda com security definer porque o usuario ainda nao tem sessao ate confirmar o email. Sem role/nome (login social) cai para comprador e para o nome vindo do provedor.';
