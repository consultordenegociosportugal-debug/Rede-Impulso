-- A rota /api/visitas/agendar recalcula os horários livres e só então
-- insere — mas checar e inserir não é atômico. Duas pessoas pedindo o
-- mesmo horário do mesmo corretor quase ao mesmo tempo passam as duas
-- pela checagem (nenhuma visita existe ainda em nenhuma das duas
-- consultas) e as duas conseguem inserir, dobrando a reserva. Sem
-- índice único nenhum impedia isso no banco.
--
-- 'cancelada' fica de fora: um horário cancelado volta a ficar livre.
create unique index visitas_corretor_horario_ativo
  on visitas (corretor_id, data_hora)
  where status <> 'cancelada';
