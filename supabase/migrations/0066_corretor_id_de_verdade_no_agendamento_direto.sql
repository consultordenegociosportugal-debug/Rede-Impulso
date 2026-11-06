-- ============================================================
-- Rede Impulso — fecha a brecha de corretor_id arbitrário no
-- agendamento direto do cliente
--
-- A policy "visitas: interessado cria as proprias" (0020) só confere
-- auth.uid() = comprador_id — nunca que corretor_id é de fato um
-- corretor. Na prática a aplicação já evita o problema (sem
-- disponibilidade configurada para um profile que não é corretor, a
-- tela de agendamento nunca mostra horário pra escolher — ver
-- horariosDisponiveis()), mas a RLS sozinha deixava qualquer
-- authenticated inserir uma visita com corretor_id = qualquer profile
-- (até um id arbitrário, ou outro comprador) sem o banco barrar nada.
-- Fecha essa segunda trava, igual já foi feito em disponibilidade e
-- clientes avulsos na 0065 — usa a mesma public.e_corretor() de lá.
-- ============================================================

drop policy "visitas: interessado cria as proprias" on visitas;
create policy "visitas: interessado cria as proprias"
  on visitas for insert
  to authenticated
  with check (auth.uid() = comprador_id and public.e_corretor(corretor_id));
