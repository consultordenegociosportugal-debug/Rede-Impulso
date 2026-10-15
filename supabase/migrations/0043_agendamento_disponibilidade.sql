-- ============================================================
-- Rede Impulso — módulo de agendamento (disponibilidade real)
--
-- Levantamento no AppBarber (appbarber.com.br): o mecanismo central
-- de um sistema de agendamento de verdade não é "pedir um horário e
-- esperar confirmação" (o que `visitas`, migração 0020, já fazia) — é
-- o profissional definir os horários em que atende, e quem agenda só
-- enxergar e escolher entre os horários realmente livres. Isso elimina
-- o vai-e-volta de confirmar manualmente: se o horário apareceu como
-- livre, a visita já nasce confirmada.
--
-- Não trouxemos pro nosso produto o resto do AppBarber (estoque,
-- comandas, programa de fidelidade, pagamento on-line) — é tudo
-- pensado pra barbearia/salão vender produto e serviço avulso, sem
-- relação com o funil de leads imobiliário da Rede Impulso.
-- ============================================================

create table disponibilidade_semanal (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  created_at timestamptz not null default now(),
  constraint disponibilidade_semanal_horario_valido check (hora_fim > hora_inicio),
  unique (profile_id, dia_semana)
);

comment on table disponibilidade_semanal is 'Janela de atendimento semanal de um corretor/vendedor (um intervalo por dia da semana, 0=domingo). Usada para calcular horários livres de visita.';

create index on disponibilidade_semanal (profile_id);

alter table disponibilidade_semanal enable row level security;

create policy "disponibilidade_semanal: dono gerencia a propria"
  on disponibilidade_semanal for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Horário de atendimento não é dado sensível — qualquer autenticado
-- precisa ler pra calcular os horários livres de outra pessoa na hora
-- de agendar uma visita.
create policy "disponibilidade_semanal: qualquer autenticado le"
  on disponibilidade_semanal for select
  to authenticated
  using (true);

-- Visita que nasce já confirmada (porque veio de um horário realmente
-- livre) ainda precisa de lembrete antes da hora — sem isso o módulo
-- não é diferente de uma agenda de papel.
alter table visitas add column lembrete_enviado_em timestamptz;

comment on column visitas.lembrete_enviado_em is 'Quando o e-mail de lembrete da visita foi enviado — evita reenvio. Ver /api/visitas/avisar-lembrete.';
