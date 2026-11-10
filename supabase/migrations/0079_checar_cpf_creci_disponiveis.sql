-- O cadastro de corretor descobre CPF/CRECI duplicados só depois do signUp,
-- quando a constraint única (migração 0071) já rejeitou o insert dentro do
-- trigger handle_new_user(). Nesse ponto o Supabase Auth (GoTrue) mascara o
-- texto cru do erro do Postgres e devolve só "Database error saving new
-- user" pro client — a mensagem específica por constraint que
-- traduzErroAuth() tenta casar nunca chega. Esta função deixa o formulário
-- checar duplicidade ANTES do signUp, sem depender da mensagem de erro.
create or replace function public.cpf_creci_disponiveis(p_cpf text, p_creci text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'cpf_disponivel', not exists (
      select 1 from corretor_perfis
      where cpf is not null and cpf <> '' and cpf = nullif(trim(p_cpf), '')
    ),
    'creci_disponivel', not exists (
      select 1 from corretor_perfis
      where creci is not null and creci <> '' and creci = nullif(trim(p_creci), '')
    )
  );
$$;

grant execute on function public.cpf_creci_disponiveis(text, text) to anon, authenticated;
