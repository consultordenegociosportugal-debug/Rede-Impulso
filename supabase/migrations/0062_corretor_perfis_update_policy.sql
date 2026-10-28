-- A 0058 (drop column imobiliaria_id cascade) derrubou junto, sem
-- ninguém notar, a policy de UPDATE de corretor_perfis (0002): o
-- "using"/"with check" dela citava imobiliaria_id, então o Postgres
-- apagou a própria policy no cascade. Desde então todo corretor
-- editando CPF/CRECI/bairros/cidade em /editar-perfil recebia "Perfil
-- atualizado." mas o update não batia em nenhuma linha (RLS sem
-- policy = ninguém edita) — silencioso, sem erro nenhum pro usuário.
--
-- Recriando só com o dono (o vínculo com organizacoes_catalogo, 0053,
-- já é autosserviço do próprio corretor — não existe mais conta de
-- imobiliária/construtora editando o perfil de terceiros).
create policy "corretor_perfis: dono edita o proprio"
  on corretor_perfis for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
