-- ============================================================
-- Rede Impulso — salva disponibilidade semanal de forma atômica
--
-- DisponibilidadeForm salvava substituindo tudo: apagava todas as
-- janelas do corretor e, numa segunda chamada separada, inseria as
-- novas. Duas chamadas de rede distintas, sem transação nenhuma ligando
-- as duas — se a internet caísse, a sessão expirasse ou qualquer coisa
-- desse errado bem entre o delete (que sempre ia até o fim) e o insert
-- (que podia falhar), o corretor ficava com a disponibilidade inteira
-- ZERADA: nenhum cliente, nem o próprio corretor, conseguia mais ver ou
-- marcar nenhum horário com ele até ele notar e salvar de novo.
--
-- Uma function faz as duas operações na mesma transação implícita da
-- chamada: se o insert falhar, o delete é desfeito junto — nunca fica
-- um meio-termo "apagou mas não recriou". security invoker (padrão)
-- mantém a RLS de disponibilidade_semanal valendo normalmente dentro da
-- function, então o corretor só mexe na própria (e só se for corretor
-- de verdade — mesma policy da 0065, sem precisar duplicar a checagem
-- aqui).
-- ============================================================

create or replace function public.salvar_disponibilidade_semanal(p_janelas jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from disponibilidade_semanal where profile_id = auth.uid();

  insert into disponibilidade_semanal (profile_id, dia_semana, hora_inicio, hora_fim)
  select
    auth.uid(),
    (janela->>'dia_semana')::smallint,
    (janela->>'hora_inicio')::time,
    (janela->>'hora_fim')::time
  from jsonb_array_elements(p_janelas) as janela;
end;
$$;

comment on function public.salvar_disponibilidade_semanal(jsonb) is 'Substitui toda a disponibilidade_semanal do corretor logado numa unica transacao (delete + insert) — evita ficar com a agenda zerada se o insert falhar depois do delete. p_janelas: array de {dia_semana, hora_inicio, hora_fim}.';

grant execute on function public.salvar_disponibilidade_semanal(jsonb) to authenticated;
