-- ============================================================
-- Rede Impulso — CPF e CRECI únicos entre corretores
--
-- Nada impedia duas contas de corretor diferentes de terem o MESMO CPF
-- ou o MESMO CRECI — nem o signUp inicial (handle_new_user, migração
-- 0059) nem o completar-cadastro faziam essa checagem, e o banco nunca
-- teve essa constraint. CRECI é o registro profissional (mostrado
-- publicamente no perfil do corretor) — duas contas com o mesmo número
-- é exatamente o tipo de coisa que quebra a credibilidade da
-- plataforma. CPF é a mesma garantia do lado documental.
--
-- Índice PARCIAL (where ... is not null and ... <> ''): CPF/CRECI vazio
-- vira NULL antes de chegar aqui (ver handle_new_user e
-- completar-cadastro/form.tsx), e o Postgres já trata múltiplos NULLs
-- como não-conflitantes numa unique constraint — a cláusula aqui é só
-- defensiva, pra nunca travar num '' residual de alguma linha antiga.
--
-- Esta migration FALHA se já existir alguma duplicata na base — resolva
-- as duplicatas (uma das contas precisa ser corrigida ou removida)
-- antes de rodar.
-- ============================================================

create unique index if not exists corretor_perfis_cpf_key
  on corretor_perfis (cpf)
  where cpf is not null and cpf <> '';

create unique index if not exists corretor_perfis_creci_key
  on corretor_perfis (creci)
  where creci is not null and creci <> '';
