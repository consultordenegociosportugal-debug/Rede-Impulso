-- ============================================================
-- Rede Impulso — notificações push (Web Push)
--
-- Pedido do usuário (2026-11-24): o corretor precisa saber NA HORA
-- quando um cliente agenda, cancela ou responde o lembrete, sem
-- depender de abrir o painel. Cada dispositivo/navegador em que o
-- corretor autoriza notificação vira uma "inscrição" — um corretor
-- pode ter mais de uma (celular + computador, por exemplo), por isso
-- é tabela separada e não uma coluna em profiles.
-- ============================================================

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

comment on table push_subscriptions is 'Inscrições de notificação push (Web Push) por dispositivo/navegador — um corretor pode ter várias.';
comment on column push_subscriptions.endpoint is 'URL do serviço de push do navegador (push.services.mozilla.com, fcm.googleapis.com, etc.) — único por dispositivo/navegador, identifica a inscrição.';

create index on push_subscriptions (profile_id);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions: dono gerencia as suas"
  on push_subscriptions for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
