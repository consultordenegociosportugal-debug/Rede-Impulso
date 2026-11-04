-- ============================================================
-- Rede Impulso — fecha a brecha de papel em disponibilidade,
-- clientes avulsos e agendamento por cliente avulso
--
-- As policies de disponibilidade_semanal (0043), clientes_avulsos
-- (0051) e a de inserção "visitas: corretor agenda para cliente
-- avulso" (0051) só confirmavam auth.uid() = <coluna-dona> — nunca se
-- esse uid pertence de fato a um corretor. Na prática, qualquer
-- comprador autenticado conseguia abrir /painel-negocios/disponibilidade
-- e configurar horários pra si mesmo e, depois, usar
-- /painel-negocios/clientes pra se auto-agendar como se fosse corretor.
--
-- Usa a mesma referência que /buscar-profissionais e /perfil-corretor
-- já usam para decidir quem é corretor de verdade: ter uma linha em
-- corretor_perfis.
-- ============================================================

create or replace function public.e_corretor(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from corretor_perfis where profile_id = p_profile_id);
$$;

comment on function public.e_corretor(uuid) is 'Verdade quando o perfil tem uma linha em corretor_perfis — usada nas policies que só corretor de verdade pode exercer (disponibilidade, clientes avulsos, agendar por cliente avulso).';

drop policy "disponibilidade_semanal: dono gerencia a propria" on disponibilidade_semanal;
create policy "disponibilidade_semanal: dono gerencia a propria"
  on disponibilidade_semanal for all
  to authenticated
  using (auth.uid() = profile_id and public.e_corretor(auth.uid()))
  with check (auth.uid() = profile_id and public.e_corretor(auth.uid()));

drop policy "clientes_avulsos: corretor gerencia os seus" on clientes_avulsos;
create policy "clientes_avulsos: corretor gerencia os seus"
  on clientes_avulsos for all
  to authenticated
  using (auth.uid() = corretor_id and public.e_corretor(auth.uid()))
  with check (auth.uid() = corretor_id and public.e_corretor(auth.uid()));

drop policy "visitas: corretor agenda para cliente avulso" on visitas;
create policy "visitas: corretor agenda para cliente avulso"
  on visitas for insert
  to authenticated
  with check (
    auth.uid() = corretor_id
    and cliente_avulso_id is not null
    and public.e_corretor(auth.uid())
  );
