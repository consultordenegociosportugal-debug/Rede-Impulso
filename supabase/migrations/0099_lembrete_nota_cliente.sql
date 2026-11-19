-- ============================================================
-- Rede Impulso — lembrete de follow-up em cima de uma nota
--
-- Segunda peça do CRM (pedido do usuário em 2026-11-19, em cima da
-- primeira — notas, migração 0098): ao escrever uma nota, o corretor
-- pode opcionalmente pedir "me lembra disso em tal dia". Vira um
-- lembrete que aparece no painel principal quando a data chega, até
-- ele marcar como concluído. De propósito continua sem estágio de
-- funil — é só "aquele texto, numa data, até eu resolver".
-- ============================================================

alter table clientes_notas add column lembrar_em date;
alter table clientes_notas add column lembrete_concluido_em timestamptz;

comment on column clientes_notas.lembrar_em is 'Data em que o corretor pediu pra ser lembrado desta nota — opcional. Nulo = nota comum, sem lembrete.';
comment on column clientes_notas.lembrete_concluido_em is 'Quando o corretor marcou o lembrete como resolvido. Nulo + lembrar_em no passado/hoje = lembrete pendente.';

-- Painel principal filtra por "lembrar_em <= hoje and lembrete_concluido_em is null" —
-- esse índice parcial cobre exatamente essa consulta, sem pesar em notas sem lembrete.
create index on clientes_notas (corretor_id, lembrar_em) where lembrete_concluido_em is null;
