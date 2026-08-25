-- ============================================================
-- Rede Impulso — esquema inicial do banco de dados
-- Baseado no relatório de produto (docs/rede-impulso-relatorio.md):
-- 5 perfis de usuário, fluxo de negócio ponta a ponta, matching de
-- corretores, cartório nativo no fechamento, gestão de corretores
-- pela imobiliária e mural de conquistas.
-- Alvo: Postgres via Supabase (usa auth.users como base de identidade).
-- ============================================================

-- ---------- Tipos ----------

create type user_role as enum (
  'comprador',
  'vendedor',
  'corretor',
  'imobiliaria',
  'cartorio'
);

create type verification_status as enum (
  'pendente',
  'em_analise',
  'aprovado',
  'rejeitado'
);

create type documento_tipo as enum (
  'cnpj',
  'identidade',
  'creci',
  'comprovante_residencia',
  'registro_serventia',
  'documento_imovel',
  'foto_imovel'
);

create type imovel_status as enum (
  'rascunho',
  'publicado',
  'em_negociacao',
  'vendido',
  'arquivado'
);

create type negocio_status as enum (
  'negociacao',
  'fechado',
  'cartorio',
  'concluido',
  'cancelado'
);

create type cartorio_status as enum (
  'documentos_pendentes',
  'em_analise',
  'escritura_marcada',
  'registrado',
  'concluido'
);

-- ---------- Identidade ----------

-- Uma linha por pessoa/empresa que usa a plataforma, seja qual for o
-- papel. O papel principal fica em `role`; um cartório nunca também é
-- corretor, mas nada impede uma mesma pessoa física de ter cadastros
-- separados como comprador e vendedor ao longo do tempo (contas
-- diferentes), conforme o relatório trata cada perfil como cadastro
-- próprio.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  nome text not null,
  telefone text,
  email text,
  rede_social text,
  foto_url text,
  verification_status verification_status not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Identidade base de qualquer usuário da Rede Impulso, independente do papel.';

-- Extensão 1:1 para corretores autônomos e corretores de imobiliária.
create table corretor_perfis (
  profile_id uuid primary key references profiles (id) on delete cascade,
  creci text not null,
  bairros_atuacao text[] not null default '{}',
  imobiliaria_id uuid references profiles (id) on delete set null,
  meta_mensal numeric(12, 2),
  estrelas numeric(2, 1) not null default 0,
  total_negocios integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column corretor_perfis.imobiliaria_id is 'Vínculo atual corretor ↔ imobiliária. Nulo = corretor autônomo.';
comment on column corretor_perfis.ativo is 'Controlado pela imobiliária no painel de gestão de corretores (ativar/desativar).';

-- Extensão 1:1 para imobiliárias.
create table imobiliaria_perfis (
  profile_id uuid primary key references profiles (id) on delete cascade,
  cnpj text not null,
  nome_fantasia text not null,
  created_at timestamptz not null default now()
);

-- Extensão 1:1 para cartórios.
create table cartorio_perfis (
  profile_id uuid primary key references profiles (id) on delete cascade,
  registro_serventia text not null,
  created_at timestamptz not null default now()
);

-- Documentos de verificação de cadastro (CNPJ, identidade, CRECI,
-- comprovante de residência, registro de serventia). Um perfil pode
-- ter vários documentos, cada um com status próprio de análise.
create table documentos_verificacao (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  tipo documento_tipo not null,
  arquivo_url text not null,
  status verification_status not null default 'pendente',
  created_at timestamptz not null default now()
);

create index on documentos_verificacao (profile_id);

-- ---------- Imóveis ----------

create table imoveis (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references profiles (id) on delete cascade,
  titulo text not null,
  bairro text not null,
  cidade text not null,
  descricao text,
  preco numeric(14, 2),
  status imovel_status not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table imoveis is 'Publicado pelo cliente vendedor. Precisa de status = publicado e no mínimo 3 fotos para entrar no matching.';

create index on imoveis (bairro);
create index on imoveis (status);

create table imovel_fotos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete cascade,
  arquivo_url text not null,
  ordem integer not null default 0
);

create index on imovel_fotos (imovel_id);

-- Registro do matching feito ao publicar o imóvel: quais corretores
-- foram sugeridos/notificados e com que "score" (bairro + sucesso).
-- Fica separado de `negocios` porque nem toda sugestão vira negócio.
create table sugestoes_corretor (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete cascade,
  corretor_id uuid not null references profiles (id) on delete cascade,
  score numeric(6, 2) not null default 0,
  notificado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (imovel_id, corretor_id)
);

create index on sugestoes_corretor (imovel_id);

-- ---------- Negócio (ponta a ponta) ----------

-- O cartório é tratado como colunas do próprio negócio (não uma
-- tabela separada) porque a relação é 1:1 — a "fila de processos" do
-- painel do cartório é simplesmente `where cartorio_id = :id`.
create table negocios (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete restrict,
  comprador_id uuid references profiles (id) on delete set null,
  corretor_id uuid references profiles (id) on delete set null,
  imobiliaria_id uuid references profiles (id) on delete set null,
  status negocio_status not null default 'negociacao',
  valor_fechado numeric(14, 2),
  comissao_prevista numeric(12, 2),
  cartorio_id uuid references profiles (id) on delete set null,
  cartorio_status cartorio_status,
  fechado_em timestamptz,
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column negocios.cartorio_id is 'Escolhido pelo corretor/imobiliária ou pelo cliente ao fechar o negócio. Regra de desempate ainda em aberto no produto.';
comment on column negocios.cartorio_status is 'Preenchido só a partir do momento em que o negócio entra em cartório.';

create index on negocios (corretor_id);
create index on negocios (imobiliaria_id);
create index on negocios (cartorio_id);
create index on negocios (status);

-- Documentos do negócio (contrato, matrícula, escritura etc.),
-- centralizados para o cartório acessar sem gerir processos externos.
create table negocio_documentos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  tipo text not null,
  arquivo_url text not null,
  status verification_status not null default 'pendente',
  created_at timestamptz not null default now()
);

create index on negocio_documentos (negocio_id);

-- ---------- Mural de conquistas ----------

create table depoimentos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  autor_id uuid not null references profiles (id) on delete cascade,
  corretor_id uuid references profiles (id) on delete set null,
  texto text not null,
  estrelas numeric(2, 1) not null,
  created_at timestamptz not null default now()
);

create index on depoimentos (corretor_id);

-- ---------- Serviços complementares (pós-negócio) ----------

create table parceiros_servico (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nome text not null,
  contato text,
  ativo boolean not null default true
);

create table ofertas_pos_negocio (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  parceiro_id uuid references parceiros_servico (id) on delete set null,
  categoria text not null,
  status text not null default 'oferecida',
  created_at timestamptz not null default now()
);

-- ---------- updated_at automático ----------

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_imoveis_updated_at before update on imoveis
  for each row execute function set_updated_at();
create trigger trg_negocios_updated_at before update on negocios
  for each row execute function set_updated_at();
