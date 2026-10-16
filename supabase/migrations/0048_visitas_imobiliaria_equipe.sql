-- ============================================================
-- Rede Impulso — imobiliária enxerga as visitas da própria equipe
--
-- Gap encontrado construindo o Dashboard (métricas agregadas por
-- imobiliária, inspirado no painel "dono" do AppBarber): a RLS de
-- `visitas` (migração 0020) só deixava o PRÓPRIO corretor ou o vendedor
-- do imóvel enxergar a visita. Uma imobiliária não tem como somar
-- "visitas agendadas da equipe" se nem consegue ler as linhas dos
-- corretores vinculados a ela.
--
-- `negocios` já resolvia isso com uma coluna `imobiliaria_id` própria
-- (migração 0004); `visitas` não tem (nem precisa) essa coluna — dá pra
-- resolver direto pelo vínculo em corretor_perfis.
-- ============================================================

create policy "visitas: imobiliaria da equipe ve"
  on visitas for select
  to authenticated
  using (
    exists (
      select 1 from corretor_perfis cp
      where cp.profile_id = visitas.corretor_id
        and cp.imobiliaria_id = auth.uid()
    )
  );
