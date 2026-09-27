-- ============================================================
-- Rede Impulso Motorista — Mapa de apoio (fase 3)
--
-- Tudo o que o motorista de aplicativo procura no meio do turno, além
-- de recarga: GNV, banheiro, lugar para descansar, comer, lavar o carro,
-- borracharia. Os eletropostos continuam em ev_eletropostos (0032) — a
-- página /motorista/apoio junta as duas fontes no mesmo mapa.
--
-- Alimentado pela comunidade (qualquer conta cadastra) e avaliado pelos
-- próprios motoristas (nota 1–5, uma por pessoa por ponto).
--
-- Ao contrário de ev_eletropostos, latitude/longitude são obrigatórias:
-- o mapa de apoio é sobre "o que está perto de mim agora", e um ponto sem
-- coordenada não aparece nele.
-- ============================================================

create type ponto_apoio_tipo as enum (
  'gnv', 'banheiro', 'descanso', 'alimentacao', 'lavagem', 'borracharia', 'outro'
);

create table pontos_apoio (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid references profiles (id) on delete set null,
  tipo ponto_apoio_tipo not null,
  nome text not null,
  endereco text not null,
  cidade text not null,
  estado text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  aberto_24h boolean not null default false,
  gratuito boolean not null default false,
  horario text,
  observacoes text,
  ativo boolean not null default true,
  origem text not null default 'comunidade' check (origem in ('comunidade', 'agente')),
  created_at timestamptz not null default now()
);

comment on table pontos_apoio is 'Pontos de apoio para motoristas (GNV, banheiro, descanso, alimentação, lavagem, borracharia). Cadastro aberto; eletropostos ficam em ev_eletropostos.';

create index on pontos_apoio (tipo);
create index on pontos_apoio (cidade);
create index on pontos_apoio (estado);

create table pontos_apoio_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references pontos_apoio (id) on delete cascade,
  autor_id uuid not null references profiles (id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (char_length(comentario) <= 500),
  created_at timestamptz not null default now(),
  unique (ponto_id, autor_id)
);

create index on pontos_apoio_avaliacoes (ponto_id);

-- Média e total de avaliações por ponto, para listar sem N+1.
-- security_invoker: respeita a RLS das tabelas de base.
create view pontos_apoio_resumo with (security_invoker = true) as
  select
    p.*,
    round(avg(a.nota)::numeric, 1) as nota_media,
    count(a.id)::int as total_avaliacoes
  from pontos_apoio p
  left join pontos_apoio_avaliacoes a on a.ponto_id = p.id
  group by p.id;

grant select on pontos_apoio_resumo to anon, authenticated;

-- ============================================================
-- RLS — leitura pública; escrita só do dono da linha.
-- ============================================================

alter table pontos_apoio enable row level security;

create policy "pontos_apoio: diretorio publico"
  on pontos_apoio for select
  to anon, authenticated
  using (true);

create policy "pontos_apoio: autenticado cadastra"
  on pontos_apoio for insert
  to authenticated
  with check (auth.uid() = criado_por);

create policy "pontos_apoio: quem cadastrou edita"
  on pontos_apoio for update
  to authenticated
  using (auth.uid() = criado_por)
  with check (auth.uid() = criado_por);

create policy "pontos_apoio: quem cadastrou remove"
  on pontos_apoio for delete
  to authenticated
  using (auth.uid() = criado_por);

alter table pontos_apoio_avaliacoes enable row level security;

create policy "pontos_apoio_avaliacoes: publicas"
  on pontos_apoio_avaliacoes for select
  to anon, authenticated
  using (true);

create policy "pontos_apoio_avaliacoes: autor avalia"
  on pontos_apoio_avaliacoes for insert
  to authenticated
  with check (auth.uid() = autor_id);

create policy "pontos_apoio_avaliacoes: autor edita a propria"
  on pontos_apoio_avaliacoes for update
  to authenticated
  using (auth.uid() = autor_id)
  with check (auth.uid() = autor_id);

create policy "pontos_apoio_avaliacoes: autor remove a propria"
  on pontos_apoio_avaliacoes for delete
  to authenticated
  using (auth.uid() = autor_id);
