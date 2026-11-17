-- ============================================================
-- Rede Impulso — endereço da organização (loja/escritório)
--
-- Feedback de corretor em teste: a visita confirmada não dizia ONDE
-- ela acontece. O corretor já tem endereço fixo de atendimento quando
-- está vinculado a uma imobiliária/construtora do catálogo — em vez de
-- pedir endereço solto em cada visita, o endereço mora na organização e
-- é reaproveitado em toda visita de quem está vinculado a ela.
-- ============================================================

alter table organizacoes_catalogo add column endereco text;

comment on column organizacoes_catalogo.endereco is 'Endereço da loja/escritório — mostrado na confirmação da visita de quem está vinculado a essa organização (corretor_perfis.organizacao_catalogo_id).';
