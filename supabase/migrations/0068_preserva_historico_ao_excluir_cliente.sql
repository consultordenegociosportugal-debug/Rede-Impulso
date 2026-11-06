-- ============================================================
-- Rede Impulso — preserva histórico de visita quando o CLIENTE
-- exclui a conta (simétrico ao que já acontece quando o CORRETOR exclui)
--
-- visitas.comprador_id tinha "on delete cascade" desde a 0020 — quando
-- o cliente excluía a conta, a visita inteira sumia sem deixar rastro
-- nenhum pro corretor (nem no histórico, nem no relatório). corretor_id
-- já usa "on delete set null" (a linha sobrevive, só perde a
-- referência) — os dois lados se comportando diferente é inconsistente,
-- e o lado cascade perdia dado sem necessidade. A UI já trata null dos
-- dois lados com fallback (ver meus-agendamentos e painel-negocios),
-- então não há risco de quebrar tela nenhuma com esta mudança.
--
-- A constraint visitas_um_cliente (0051) exigia EXATAMENTE um dos dois
-- (comprador_id, cliente_avulso_id) preenchido — com comprador_id
-- podendo virar null agora, precisa aceitar também ZERO preenchidos (a
-- visita ainda existe no histórico, só o dono da conta original não
-- existe mais).
--
-- Usada junto com a limpeza em /api/conta/excluir, que cancela e avisa
-- a contraparte ANTES de excluir a conta — ver avisar-cancelamento.ts.
-- ============================================================

do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'visitas'::regclass
    and contype = 'f'
    and conkey = array[(
      select attnum from pg_attribute
      where attrelid = 'visitas'::regclass and attname = 'comprador_id'
    )];

  if nome_constraint is not null then
    execute format('alter table visitas drop constraint %I', nome_constraint);
  end if;
end $$;

alter table visitas add constraint visitas_comprador_id_fkey
  foreign key (comprador_id) references profiles (id) on delete set null;

alter table visitas drop constraint visitas_um_cliente;
alter table visitas add constraint visitas_um_cliente
  check (((comprador_id is not null)::int + (cliente_avulso_id is not null)::int) <= 1);
