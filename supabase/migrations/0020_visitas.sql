-- ============================================================
-- Rede Impulso — agendamento de visitas ao imóvel + integração
-- opcional com o Google Agenda do corretor.
--
-- Até aqui o único contato registrado entre interessado e imóvel era
-- "manifestação de interesse" (migração 0005, para imóvel que nem
-- existe no app ainda) e `negocios` (migração 0001, que já é o funil
-- de negociação). Faltava o passo intermediário e mais concreto do
-- produto: marcar dia e hora para ver o imóvel.
--
-- Duas tabelas nesta migração:
--   1. visitas                  — o agendamento em si (funciona sozinho)
--   2. google_calendar_conexoes — tokens OAuth2 de quem conectou o
--                                 Google Agenda (camada opcional)
--
-- Decisão de produto: a visita NUNCA depende do Google. A sincronia
-- com a agenda é um bônus para quem conectou; sem conexão (ou com a
-- API do Google fora do ar) o agendamento continua funcionando
-- inteiro dentro da Rede Impulso.
-- ============================================================

create type visita_status as enum (
  'solicitada',
  'confirmada',
  'cancelada',
  'realizada'
);

-- `corretor_id` é o profissional responsável por receber a visita.
-- Não inventa um vínculo novo: reaproveita o que a migração 0006 já
-- estabeleceu como associação corretor ↔ imóvel — o corretor que o
-- vendedor escolheu ao abrir o `negocio` do imóvel. Sem corretor
-- vinculado, o responsável é o próprio vendedor do imóvel. Quem
-- preenche isso é o trigger abaixo, não o cliente.
create table visitas (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete cascade,
  comprador_id uuid not null references profiles (id) on delete cascade,
  corretor_id uuid references profiles (id) on delete set null,
  data_hora timestamptz not null,
  status visita_status not null default 'solicitada',
  observacoes text,
  google_event_id text,
  created_at timestamptz not null default now()
);

comment on table visitas is 'Agendamento de visita a um imóvel publicado. Independe do Google Agenda — a sincronia é opcional.';
comment on column visitas.corretor_id is 'Responsável pela visita: corretor vinculado ao imóvel via negocios (migração 0006) ou, na falta dele, o vendedor. Preenchido por trigger.';
comment on column visitas.google_event_id is 'Id do evento criado no Google Agenda do responsável, quando ele tem conexão ativa. Nulo = visita nunca foi sincronizada.';

create index on visitas (imovel_id);
create index on visitas (comprador_id);
create index on visitas (corretor_id);
create index on visitas (data_hora);

-- Security definer pelo mesmo motivo das functions da migração 0004:
-- ler `negocios`/`imoveis` de dentro de um trigger ou de uma policy de
-- `visitas` reacionaria o RLS daquelas tabelas.
create function public.corretor_responsavel_imovel(p_imovel_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select n.corretor_id
      from negocios n
      where n.imovel_id = p_imovel_id
        and n.corretor_id is not null
        and n.status <> 'cancelado'
      order by n.created_at desc
      limit 1
    ),
    (select i.vendedor_id from imoveis i where i.id = p_imovel_id)
  );
$$;

create function public.visitas_define_corretor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.corretor_id = public.corretor_responsavel_imovel(new.imovel_id);
  return new;
end;
$$;

-- BEFORE INSERT: o WITH CHECK do RLS roda depois dos triggers BEFORE,
-- então a linha já chega na policy com o responsável correto — e o
-- cliente não consegue forjar `corretor_id` no insert.
create trigger trg_visitas_define_corretor
  before insert on visitas
  for each row execute function public.visitas_define_corretor();

-- ---------- RLS: visitas ----------
alter table visitas enable row level security;

create policy "visitas: interessado cria as proprias"
  on visitas for insert
  to authenticated
  with check (auth.uid() = comprador_id);

create policy "visitas: interessado ve as proprias"
  on visitas for select
  to authenticated
  using (auth.uid() = comprador_id);

create policy "visitas: corretor ou vendedor do imovel veem"
  on visitas for select
  to authenticated
  using (auth.uid() = corretor_id or public.is_imovel_vendedor(imovel_id));

-- Confirmar/cancelar/marcar como realizada é do lado de quem recebe a
-- visita. O interessado não atualiza: se desistir, fala pelo canal do
-- negócio — evitar que ele mexa em `google_event_id` também mantém o
-- id do evento do Google fora do alcance de quem não é o dono da
-- agenda.
create policy "visitas: corretor ou vendedor atualizam"
  on visitas for update
  to authenticated
  using (auth.uid() = corretor_id or public.is_imovel_vendedor(imovel_id))
  with check (auth.uid() = corretor_id or public.is_imovel_vendedor(imovel_id));

-- Quem recebe a visita precisa ver nome/telefone de quem pediu, mesmo
-- que ainda não exista `negocio` entre os dois (a visita costuma vir
-- antes). A policy de 0002/0004 só cobria contraparte de negócio.
create function public.e_contraparte_de_visita(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from visitas v
    join imoveis i on i.id = v.imovel_id
    where v.comprador_id = p_profile_id
      and (v.corretor_id = auth.uid() or i.vendedor_id = auth.uid())
  );
$$;

create policy "profiles: leitura por contraparte de visita"
  on profiles for select
  to authenticated
  using (public.e_contraparte_de_visita(profiles.id));

-- ---------- google_calendar_conexoes ----------

-- Uma linha por profissional que autorizou a Rede Impulso a escrever
-- na agenda dele (escopo calendar.events). `profile_id` é a PK, então
-- reconectar é um upsert, não uma linha duplicada.
--
-- ⚠️ TRADEOFF DE SEGURANÇA (v1): `refresh_token` e `access_token` são
-- segredos de verdade — quem tem o refresh_token escreve na agenda do
-- corretor indefinidamente. Aqui eles ficam em colunas texto puro,
-- protegidos só pelo RLS abaixo (mesmo modelo de confiança das outras
-- tabelas privadas deste app, como documentos_verificacao). Em
-- produção o certo é cifrar na camada de aplicação ou guardar via
-- Supabase Vault e manter aqui apenas a referência ao segredo.
-- Nenhuma policy expõe a linha de um usuário para outro, e a chave
-- publicável (anon) só alcança a própria linha.
create table google_calendar_conexoes (
  profile_id uuid primary key references profiles (id) on delete cascade,
  refresh_token text,
  access_token text,
  expira_em timestamptz,
  calendar_id text not null default 'primary',
  conectado_em timestamptz not null default now()
);

comment on table google_calendar_conexoes is 'Tokens OAuth2 do Google Agenda por profissional. Segredos em texto puro protegidos por RLS — ver comentário na migração sobre cifrar/Vault em produção.';
comment on column google_calendar_conexoes.refresh_token is 'Obtido com access_type=offline&prompt=consent. Não volta em toda troca de código — nunca sobrescrever com nulo.';
comment on column google_calendar_conexoes.calendar_id is 'Agenda de destino. "primary" = agenda principal do próprio corretor.';

alter table google_calendar_conexoes enable row level security;

create policy "google_calendar_conexoes: dono gerencia a propria"
  on google_calendar_conexoes for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
