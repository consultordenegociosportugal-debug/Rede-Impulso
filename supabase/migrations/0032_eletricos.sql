-- ============================================================
-- Rede Impulso Elétricos — braço da rede para o mundo dos carros
-- elétricos no Brasil (visão de expandir depois, como /visao-global
-- já faz para o imobiliário em Portugal).
--
-- Quatro pontas, cada uma com sua tabela de diretório/vitrine própria
-- — v1 propositalmente simples (sem matching, sem moderação, sem
-- pagamento), igual o mural de conquistas e parceiros_servico
-- começaram antes de ganhar camadas:
--   1. ev_veiculos       — marketplace de compra e venda (como imoveis)
--   2. ev_eletropostos   — diretório de recarga, alimentado pela comunidade
--   3. ev_oficinas       — diretório de oficinas/assistência especializada
--   4. ev_posts          — feed de comunidade (dúvida/comparação/experiência/notícia)
--
-- Decisão de design: não reaproveita `user_role`/`profiles` extensions
-- do imobiliário (corretor/imobiliaria/cartorio). Aqui qualquer
-- profile — seja qual for o papel dele no lado imóveis — pode vender
-- um carro, cadastrar um eletroposto/oficina ou postar na comunidade.
-- Criar papéis novos (ex: "concessionaria") fica para quando o produto
-- realmente precisar diferenciar permissões, não agora.
-- ============================================================

-- ---------- Tipos ----------

create type ev_tipo_veiculo as enum ('eletrico', 'hibrido', 'hibrido_plugin');
create type ev_condicao as enum ('novo', 'seminovo', 'usado');
create type ev_veiculo_status as enum ('publicado', 'reservado', 'vendido', 'arquivado');
create type ev_conector as enum ('tipo2', 'ccs2', 'chademo', 'tesla', 'j1772');
create type ev_eletroposto_status as enum ('ativo', 'inativo', 'em_manutencao');
create type ev_post_categoria as enum ('duvida', 'comparacao', 'experiencia', 'noticia');

-- ---------- ev_veiculos (marketplace) ----------

create table ev_veiculos (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references profiles (id) on delete cascade,
  marca text not null,
  modelo text not null,
  ano integer not null,
  km integer,
  preco numeric(12, 2),
  tipo ev_tipo_veiculo not null default 'eletrico',
  condicao ev_condicao not null default 'usado',
  cidade text not null,
  estado text not null,
  descricao text,
  status ev_veiculo_status not null default 'publicado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table ev_veiculos is 'Anúncio de veículo elétrico/híbrido publicado pelo dono. Mesma lógica de vitrine pública de `imoveis`, sem destaque pago nem matching por enquanto.';

create index on ev_veiculos (status);
create index on ev_veiculos (cidade);
create index on ev_veiculos (tipo);

create trigger trg_ev_veiculos_updated_at before update on ev_veiculos
  for each row execute function set_updated_at();

create table ev_veiculo_fotos (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references ev_veiculos (id) on delete cascade,
  arquivo_url text not null,
  ordem integer not null default 0
);

create index on ev_veiculo_fotos (veiculo_id);

-- ---------- ev_eletropostos (diretório de recarga) ----------

-- Sem coordenadas obrigatórias: começa como diretório por cidade
-- (lista simples) e o mapa vem depois, quando tiver dado real o
-- suficiente pra valer a pena — cadastrar lat/long é opcional desde já
-- pra não perder o dado de quem já sabe informar.
create table ev_eletropostos (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid references profiles (id) on delete set null,
  nome text not null,
  endereco text not null,
  cidade text not null,
  estado text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  conectores ev_conector[] not null default '{}',
  potencia_kw numeric(6, 2),
  preco_kwh numeric(6, 2),
  operadora text,
  status ev_eletroposto_status not null default 'ativo',
  observacoes text,
  created_at timestamptz not null default now()
);

comment on table ev_eletropostos is 'Diretório de recarga alimentado pela comunidade — qualquer profile pode cadastrar um ponto que conhece. Sem verificação/moderação em v1.';

create index on ev_eletropostos (cidade);
create index on ev_eletropostos (status);

-- ---------- ev_oficinas (assistência técnica especializada) ----------

create table ev_oficinas (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid references profiles (id) on delete set null,
  nome text not null,
  especialidades text[] not null default '{}',
  atende_marcas text[] not null default '{}',
  cidade text not null,
  estado text not null,
  endereco text,
  telefone text,
  descricao text,
  created_at timestamptz not null default now()
);

comment on table ev_oficinas is 'Diretório de oficinas/técnicos especializados em elétricos — ainda escasso no Brasil, por isso o cadastro é aberto (auto-serviço), sem curadoria em v1.';

create index on ev_oficinas (cidade);

-- ---------- ev_posts / ev_comentarios (comunidade) ----------

create table ev_posts (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references profiles (id) on delete cascade,
  categoria ev_post_categoria not null default 'duvida',
  titulo text not null,
  conteudo text not null,
  created_at timestamptz not null default now()
);

create index on ev_posts (categoria);
create index on ev_posts (created_at);

create table ev_comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references ev_posts (id) on delete cascade,
  autor_id uuid not null references profiles (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

create index on ev_comentarios (post_id);

-- ============================================================
-- RLS — mesmo princípio geral do resto da Rede Impulso: diretório e
-- vitrine são públicos de leitura; escrita é sempre restrita ao dono
-- da linha (auth.uid()).
-- ============================================================

-- ---------- ev_veiculos ----------
alter table ev_veiculos enable row level security;

create policy "ev_veiculos: vitrine publica"
  on ev_veiculos for select
  to anon, authenticated
  using (status = 'publicado');

create policy "ev_veiculos: dono ve os proprios em qualquer status"
  on ev_veiculos for select
  to authenticated
  using (auth.uid() = vendedor_id);

create policy "ev_veiculos: dono publica o proprio"
  on ev_veiculos for insert
  to authenticated
  with check (auth.uid() = vendedor_id);

create policy "ev_veiculos: dono edita o proprio"
  on ev_veiculos for update
  to authenticated
  using (auth.uid() = vendedor_id)
  with check (auth.uid() = vendedor_id);

create policy "ev_veiculos: dono remove o proprio"
  on ev_veiculos for delete
  to authenticated
  using (auth.uid() = vendedor_id);

-- ---------- ev_veiculo_fotos ----------
alter table ev_veiculo_fotos enable row level security;

create policy "ev_veiculo_fotos: publicas se o veiculo esta publicado"
  on ev_veiculo_fotos for select
  to anon, authenticated
  using (
    exists (select 1 from ev_veiculos v where v.id = ev_veiculo_fotos.veiculo_id and v.status = 'publicado')
  );

create policy "ev_veiculo_fotos: dono gerencia as do proprio veiculo"
  on ev_veiculo_fotos for all
  to authenticated
  using (exists (select 1 from ev_veiculos v where v.id = ev_veiculo_fotos.veiculo_id and v.vendedor_id = auth.uid()))
  with check (exists (select 1 from ev_veiculos v where v.id = ev_veiculo_fotos.veiculo_id and v.vendedor_id = auth.uid()));

-- ---------- ev_eletropostos ----------
alter table ev_eletropostos enable row level security;

create policy "ev_eletropostos: diretorio publico"
  on ev_eletropostos for select
  to anon, authenticated
  using (true);

create policy "ev_eletropostos: autenticado cadastra"
  on ev_eletropostos for insert
  to authenticated
  with check (auth.uid() = criado_por);

create policy "ev_eletropostos: quem cadastrou edita"
  on ev_eletropostos for update
  to authenticated
  using (auth.uid() = criado_por)
  with check (auth.uid() = criado_por);

create policy "ev_eletropostos: quem cadastrou remove"
  on ev_eletropostos for delete
  to authenticated
  using (auth.uid() = criado_por);

-- ---------- ev_oficinas ----------
alter table ev_oficinas enable row level security;

create policy "ev_oficinas: diretorio publico"
  on ev_oficinas for select
  to anon, authenticated
  using (true);

create policy "ev_oficinas: autenticado cadastra"
  on ev_oficinas for insert
  to authenticated
  with check (auth.uid() = criado_por);

create policy "ev_oficinas: quem cadastrou edita"
  on ev_oficinas for update
  to authenticated
  using (auth.uid() = criado_por)
  with check (auth.uid() = criado_por);

create policy "ev_oficinas: quem cadastrou remove"
  on ev_oficinas for delete
  to authenticated
  using (auth.uid() = criado_por);

-- ---------- ev_posts ----------
alter table ev_posts enable row level security;

create policy "ev_posts: feed publico"
  on ev_posts for select
  to anon, authenticated
  using (true);

create policy "ev_posts: autor publica"
  on ev_posts for insert
  to authenticated
  with check (auth.uid() = autor_id);

create policy "ev_posts: autor edita o proprio"
  on ev_posts for update
  to authenticated
  using (auth.uid() = autor_id)
  with check (auth.uid() = autor_id);

create policy "ev_posts: autor remove o proprio"
  on ev_posts for delete
  to authenticated
  using (auth.uid() = autor_id);

-- ---------- ev_comentarios ----------
alter table ev_comentarios enable row level security;

create policy "ev_comentarios: publicos junto com o post"
  on ev_comentarios for select
  to anon, authenticated
  using (true);

create policy "ev_comentarios: autor comenta"
  on ev_comentarios for insert
  to authenticated
  with check (auth.uid() = autor_id);

create policy "ev_comentarios: autor remove o proprio"
  on ev_comentarios for delete
  to authenticated
  using (auth.uid() = autor_id);

-- ---------- storage: fotos de veículo ----------

-- Igual imovel-fotos (migração 0008): bucket público, caminho
-- convencionado por dono, pra servir a foto direto por URL pública.
insert into storage.buckets (id, name, public)
values ('ev-veiculo-fotos', 'ev-veiculo-fotos', true)
on conflict (id) do nothing;

create policy "ev-veiculo-fotos: dono gerencia as do proprio veiculo"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'ev-veiculo-fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'ev-veiculo-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
