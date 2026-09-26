-- ============================================================
-- Rede Impulso Motorista — guia para motoristas de aplicativo
-- (Uber, 99, inDrive etc.). Primeira fase:
--
--   1. motorista_perfis   — o "Raio-X do lucro real": o motorista informa
--                           carro, rotina e custos; a página calcula quanto
--                           sobra de verdade por km/hora e simula a troca
--                           por um elétrico. O cálculo é no cliente (ver
--                           src/lib/motorista/raio-x.ts); aqui só guardamos
--                           os números para ele não redigitar.
--   2. motorista_radar    — "Radar do motorista": um resumo diário gerado
--                           por agente (combustível, recarga, eventos que
--                           aumentam a demanda, regras das plataformas),
--                           com cidade/UF em cada item para a página filtrar
--                           pela cidade do motorista.
--
-- Nada aqui vem das plataformas: não temos (nem queremos) integração com a
-- conta Uber/99 do motorista. Ganhos são informados por ele.
-- ============================================================

create type motorista_combustivel as enum (
  'gasolina', 'etanol', 'flex', 'diesel', 'gnv', 'eletrico', 'hibrido'
);

-- ---------- motorista_perfis ----------

create table motorista_perfis (
  id uuid primary key references profiles (id) on delete cascade,
  cidade text,
  estado text,
  plataformas text[] not null default '{}',

  -- Rotina
  km_por_dia numeric(6, 1),
  horas_por_dia numeric(4, 1),
  dias_por_mes integer,
  faturamento_mensal numeric(10, 2),

  -- Carro atual
  veiculo text,
  combustivel motorista_combustivel,
  consumo numeric(5, 2),          -- km/l, km/m³ (GNV) ou km/kWh (elétrico)
  preco_energia numeric(6, 2),    -- R$ por litro, m³ ou kWh
  valor_veiculo numeric(12, 2),

  -- Custos mensais
  parcela_ou_aluguel numeric(10, 2),
  seguro numeric(10, 2),
  manutencao numeric(10, 2),
  outros_custos numeric(10, 2),

  updated_at timestamptz not null default now()
);

comment on table motorista_perfis is 'Números do Raio-X do lucro real, um por motorista. Dado sensível (renda e rotina): só o próprio dono lê e escreve.';

create trigger trg_motorista_perfis_updated_at before update on motorista_perfis
  for each row execute function set_updated_at();

alter table motorista_perfis enable row level security;

create policy "motorista_perfis: dono le"
  on motorista_perfis for select
  to authenticated
  using (auth.uid() = id);

create policy "motorista_perfis: dono cria"
  on motorista_perfis for insert
  to authenticated
  with check (auth.uid() = id);

create policy "motorista_perfis: dono edita"
  on motorista_perfis for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "motorista_perfis: dono apaga"
  on motorista_perfis for delete
  to authenticated
  using (auth.uid() = id);

-- ---------- motorista_radar ----------

create table motorista_radar (
  id uuid primary key default gen_random_uuid(),
  data_referencia date not null unique,
  -- Array de {categoria, titulo, texto, cidade, estado, fonte}. cidade e
  -- estado nulos = vale para o Brasil todo.
  itens jsonb not null,
  -- Preço médio nacional da semana (ANP), usado como sugestão no Raio-X:
  -- {gasolina, etanol, diesel, gnv, fonte}.
  precos_referencia jsonb,
  created_at timestamptz not null default now()
);

comment on table motorista_radar is 'Resumo diário para motoristas de aplicativo, gerado pelo job /api/motorista/radar/atualizar. Público.';

create index on motorista_radar (data_referencia desc);

alter table motorista_radar enable row level security;

create policy "motorista_radar: leitura publica"
  on motorista_radar for select
  to anon, authenticated
  using (true);

-- Escrita só pela service role (o job), igual aos agentes de 0033.
