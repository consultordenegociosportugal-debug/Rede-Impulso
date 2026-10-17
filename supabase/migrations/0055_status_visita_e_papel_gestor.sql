-- ============================================================
-- Rede Impulso — status "não compareceu" e papel de gestor
--
-- Dois valores de enum novos, cada um numa migration própria: o
-- Postgres não deixa usar um valor de enum recém-criado na mesma
-- transação em que ele foi adicionado. Rode esta migration sozinha,
-- confirme, só depois rode a 0056 (que já usa os dois valores).
-- ============================================================

alter type visita_status add value 'nao_compareceu';

alter type user_role add value 'gestor';
