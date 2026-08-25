-- ============================================================
-- Rede Impulso — criação automática de profile no cadastro
--
-- "Confirm email" está ativado no projeto (Authentication > Sign In
-- / Providers), então logo após signUp() o usuário ainda não tem uma
-- sessão autenticada — só depois de clicar no link do e-mail. Isso
-- significa que o cliente NÃO pode inserir em `profiles` na hora do
-- cadastro (auth.uid() ainda seria nulo, a policy de insert falharia).
--
-- Solução padrão do Supabase: um trigger em auth.users com
-- security definer, que roda com privilégio de dono da function
-- (ignora RLS) e cria o profile a partir dos metadados enviados em
-- supabase.auth.signUp({ options: { data: {...} } }).
-- ============================================================

create function public.handle_new_user()
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

  insert into public.profiles (id, role, nome, telefone, email, rede_social)
  values (
    new.id,
    v_role,
    coalesce(meta->>'nome', ''),
    meta->>'telefone',
    new.email,
    nullif(meta->>'rede_social', '')
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

comment on function public.handle_new_user() is 'Cria a linha em profiles (e na extensao de papel) a partir dos metadados do signUp — roda com security definer porque o usuario ainda nao tem sessao ate confirmar o email.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
