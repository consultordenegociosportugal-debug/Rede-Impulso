-- Até aqui só o corretor tinha RLS de UPDATE em `visitas` (migração
-- 0057) — o cliente só podia criar e ver as próprias visitas, nunca
-- cancelar. /api/visitas/cancelar agora aceita o cliente como ator
-- também; esta policy é o que de fato permite esse update passar.
--
-- `with check` trava a mudança em "cancelada" apenas — mesmo que um bug
-- futuro na rota tentasse mandar outro status pelo cliente, o banco
-- rejeita. `using` exclui visita já num estado terminal (cancelada,
-- realizada, não-compareceu), então não tem como "reabrir" uma visita
-- fechada só reenviando o mesmo update.
create policy "visitas: comprador cancela a sua"
  on visitas for update
  to authenticated
  using (auth.uid() = comprador_id and status not in ('cancelada', 'realizada', 'nao_compareceu'))
  with check (auth.uid() = comprador_id and status = 'cancelada');
