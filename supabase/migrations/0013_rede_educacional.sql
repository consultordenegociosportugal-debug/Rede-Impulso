-- ============================================================
-- Rede Impulso — rede educacional (cursos e capacitação)
--
-- Cursos pagos pra corretor, imobiliária e cartório se capacitarem.
-- Pagamento real via Mercado Pago fica pendente até termos as chaves
-- de API (mesma situação do Google Maps) — por isso matriculas nasce
-- com status 'pendente_pagamento' e um campo solto pra guardar o id
-- do pagamento quando a integração entrar.
-- ============================================================

create type curso_publico as enum ('corretor', 'imobiliaria', 'cartorio', 'todos');
create type matricula_status as enum ('pendente_pagamento', 'pago', 'concluido', 'cancelado');

create table cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  instrutor text,
  publico curso_publico not null default 'todos',
  carga_horaria integer,
  preco numeric(10, 2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table matriculas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  status matricula_status not null default 'pendente_pagamento',
  valor numeric(10, 2) not null,
  pagamento_provedor text,
  pagamento_referencia text,
  created_at timestamptz not null default now(),
  unique (curso_id, profile_id)
);

create index on matriculas (profile_id);

alter table cursos enable row level security;
alter table matriculas enable row level security;

create policy "cursos: diretorio publico"
  on cursos for select
  to anon, authenticated
  using (ativo);

create policy "matriculas: dono ve e cria as proprias"
  on matriculas for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

insert into cursos (titulo, descricao, instrutor, publico, carga_horaria, preco) values
  ('Negociação avançada para corretores', 'Técnicas de negociação e fechamento aplicadas ao mercado imobiliário local.', 'Rede Impulso', 'corretor', 8, 197.00),
  ('Gestão de equipes para imobiliárias', 'Como estruturar metas, ranking e distribuição de leads entre corretores.', 'Rede Impulso', 'imobiliaria', 6, 297.00),
  ('Atualização em registro de imóveis', 'Mudanças recentes na legislação de registro e escritura para cartórios.', 'Rede Impulso', 'cartorio', 4, 247.00),
  ('Fundamentos do mercado imobiliário', 'Introdução completa para quem está começando em qualquer ponta da rede.', 'Rede Impulso', 'todos', 10, 147.00);
