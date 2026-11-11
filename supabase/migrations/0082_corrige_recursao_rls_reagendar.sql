-- A policy da migração 0081 quebrou com "infinite recursion detected in
-- policy for relation visitas" — o EXISTS do with check consulta a
-- própria `visitas`, e essa sub-consulta precisa avaliar as policies de
-- SELECT de `visitas` de novo, criando o ciclo. Mesmo problema que a
-- migração 0004 (fix_rls_recursion) já resolveu antes pra outras
-- tabelas: a saída é tirar a sub-consulta da policy e colocar numa
-- função security definer, que roda ignorando RLS (não reavalia as
-- policies de novo).
drop policy "visitas: corretor reagenda visita de comprador que ja atendeu" on visitas;

create function public.corretor_ja_atendeu_comprador(p_comprador_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from visitas v
    where v.corretor_id = auth.uid() and v.comprador_id = p_comprador_id
  );
$$;

create policy "visitas: corretor reagenda visita de comprador que ja atendeu"
  on visitas for insert
  to authenticated
  with check (
    auth.uid() = corretor_id
    and comprador_id is not null
    and public.corretor_ja_atendeu_comprador(comprador_id)
  );
