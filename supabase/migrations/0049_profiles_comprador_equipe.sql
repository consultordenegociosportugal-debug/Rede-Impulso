-- ============================================================
-- Rede Impulso — imobiliária lê o perfil do cliente da própria equipe
--
-- Mesmo gap da migração 0048, um passo adiante: a policy "profiles:
-- leitura por contraparte de visita" (migração 0020) só libera o nome
-- do comprador pra quem é EXATAMENTE o corretor_id da visita ou o
-- vendedor do imóvel. Com a visita já visível pra imobiliária (0048),
-- faltava isso — sem ela o Relatório de Visitas mostra "Cliente: —"
-- pra toda visita que não é da própria imobiliária.
-- ============================================================

create policy "profiles: leitura de comprador por imobiliaria da equipe"
  on profiles for select
  to authenticated
  using (
    exists (
      select 1
      from visitas v
      join corretor_perfis cp on cp.profile_id = v.corretor_id
      where v.comprador_id = profiles.id
        and cp.imobiliaria_id = auth.uid()
    )
  );
