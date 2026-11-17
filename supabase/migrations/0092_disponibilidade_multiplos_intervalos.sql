-- ============================================================
-- Rede Impulso — disponibilidade semanal com mais de um intervalo
-- por dia (ex.: 08h-12h e 14h-18h, com intervalo de almoço no meio)
--
-- Feedback de corretor em teste: a disponibilidade só aceitava UM
-- bloco corrido por dia (migração 0043, unique (profile_id,
-- dia_semana)) — não dava pra representar um intervalo de almoço sem
-- fingir que o corretor não atende nesse período junto com o horário
-- real. `horariosDisponiveis` (src/lib/disponibilidade.ts) já itera
-- sobre TODAS as janelas do dia — só a constraint do banco e o
-- formulário impediam cadastrar mais de uma.
-- ============================================================

alter table disponibilidade_semanal drop constraint disponibilidade_semanal_profile_id_dia_semana_key;
