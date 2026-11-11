-- Bug pré-existente encontrado testando o cancelamento pelo cliente: o
-- corretor reagendar uma visita cancelada (/api/visitas/reagendar, que
-- faz um INSERT com o mesmo corretor_id/comprador_id de antes) só
-- tinha policy de insert pra dois casos — "interessado cria a própria"
-- (exige auth.uid() = comprador_id, não é o caso aqui: quem reagenda é
-- o CORRETOR) e "corretor agenda para cliente avulso" (exige
-- cliente_avulso_id, não comprador_id). Reagendar a visita de um
-- cliente com CONTA PRÓPRIA (comprador_id) sempre violou RLS — só
-- nunca foi notado porque até agora nada forçava esse caminho de teste.
--
-- A policy abaixo só libera quando já existe alguma visita anterior
-- entre esse corretor e esse comprador — nunca permite o corretor
-- "inventar" uma visita pra um cliente com quem nunca teve relação
-- nenhuma.
create policy "visitas: corretor reagenda visita de comprador que ja atendeu"
  on visitas for insert
  to authenticated
  with check (
    auth.uid() = corretor_id
    and comprador_id is not null
    and exists (
      select 1 from visitas v
      where v.corretor_id = auth.uid() and v.comprador_id = comprador_id
    )
  );
