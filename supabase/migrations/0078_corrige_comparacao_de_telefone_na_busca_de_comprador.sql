-- ============================================================
-- Rede Impulso — corrige comparação de telefone em
-- buscar_comprador_por_telefone_e164
--
-- profiles.telefone é salvo no formato "bonito" que a pessoa digitou
-- no TelefoneComPaisInput (ex.: "+55(98) 9 8888-0099"), nunca no E.164
-- limpo ("+5598988880099") que esta function espera -- nenhum dos 5
-- lugares do código que salvam telefone (editar-perfil,
-- cadastro-cliente, cadastro-profissional, completar-cadastro,
-- novo-cliente-form) normaliza antes de gravar.
--
-- Resultado: a comparação exata `p.telefone = p_telefone` nunca batia
-- com nenhuma conta real -- a função "cliente avulso já é um
-- comprador cadastrado" (migração 0070) nunca encontrava ninguém,
-- silenciosamente. Troca para comparar só os dígitos dos dois lados,
-- que é robusto independente de qual formato cada linha tenha.
-- ============================================================

create or replace function public.buscar_comprador_por_telefone_e164(p_telefone text)
returns table (id uuid, nome text, email text, telefone text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from corretor_perfis where profile_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select p.id, p.nome, p.email, p.telefone
  from profiles p
  where p.role = 'comprador'
    and regexp_replace(p.telefone, '\D', '', 'g') = regexp_replace(p_telefone, '\D', '', 'g')
  limit 1;
end;
$$;
