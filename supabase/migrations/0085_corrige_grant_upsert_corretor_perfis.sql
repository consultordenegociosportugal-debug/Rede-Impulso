-- O upsert de completar-cadastro/form.tsx (INSERT ... ON CONFLICT
-- (profile_id) DO UPDATE SET ...) inclui profile_id no SET porque ele
-- vem no corpo da requisição — e o Postgres exige privilégio de UPDATE
-- em TODA coluna do SET, mesmo sendo a própria chave do conflito (cujo
-- valor nunca muda de fato). A 0073/0084 nunca cobriram profile_id,
-- então corretor via login social (Google/Facebook) escolhendo "sou
-- corretor" batia em "permission denied for table corretor_perfis" —
-- bug pré-existente, só exposto agora ao testar esse caminho.
grant update (profile_id, creci, bairros_atuacao, cidades_atuacao, organizacao_catalogo_id, cpf)
  on corretor_perfis to authenticated;
