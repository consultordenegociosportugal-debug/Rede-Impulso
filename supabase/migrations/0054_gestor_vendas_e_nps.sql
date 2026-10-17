-- ============================================================
-- Rede Impulso — gestor de vendas da organização + NPS de qualidade
--
-- Duas coisas:
--
-- 1. Contato do gestor de vendas em cada organização do catálogo
--    (migração 0053) — recebe cópia do aviso quando um corretor vinculado
--    a ela cadastra e agenda um cliente.
--
-- 2. NPS pós-visita: depois que a visita acontece, o cliente recebe um
--    link (por token, sem precisar de login) pra avaliar de 0 a 10. A
--    nota alimenta as métricas de qualidade de corretor/organização.
-- ============================================================

alter table organizacoes_catalogo add column email_gestor text;

comment on column organizacoes_catalogo.email_gestor is 'E-mail do gestor de vendas — recebe cópia do aviso de agendamento dos corretores vinculados a esta organização.';

alter table visitas add column nps_token uuid not null default gen_random_uuid();
alter table visitas add column nps_enviado_em timestamptz;

comment on column visitas.nps_token is 'Usado no link do e-mail de pesquisa de satisfação (/nps/[token]) — responder não exige login.';
comment on column visitas.nps_enviado_em is 'Quando o e-mail de pesquisa NPS foi enviado — evita reenvio. Ver /api/visitas/pedir-nps.';

create unique index on visitas (nps_token);

create table nps_respostas (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visitas (id) on delete cascade,
  nota smallint not null check (nota between 0 and 10),
  comentario text,
  created_at timestamptz not null default now(),
  unique (visita_id)
);

comment on table nps_respostas is 'Resposta do cliente à pesquisa de satisfação (0 a 10) sobre uma visita — uma por visita.';

alter table nps_respostas enable row level security;

-- Responder não precisa de login (a validação de "essa visita existe e
-- ainda não foi respondida" é feita pelo servidor via token, não RLS) —
-- a service role grava a resposta. Leitura é só de quem participou da
-- visita (corretor) ou do admin, pra métricas.
create policy "nps_respostas: corretor da visita le"
  on nps_respostas for select
  to authenticated
  using (
    exists (
      select 1 from visitas v
      where v.id = nps_respostas.visita_id
        and v.corretor_id = auth.uid()
    )
  );

create policy "nps_respostas: admin le todas"
  on nps_respostas for select
  to authenticated
  using (public.is_admin());
