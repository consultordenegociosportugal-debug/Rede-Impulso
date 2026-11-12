-- A migração 0073 travou UPDATE em corretor_perfis por coluna
-- (creci, bairros_atuacao, cidade, organizacao_catalogo_id, cpf). A
-- 0083 trocou `cidade` por `cidades_atuacao` mas esqueceu de atualizar
-- esse grant — corretor ficava com "permission denied for table
-- corretor_perfis" ao tentar salvar o próprio perfil.
grant update (creci, bairros_atuacao, cidades_atuacao, organizacao_catalogo_id, cpf)
  on corretor_perfis to authenticated;
