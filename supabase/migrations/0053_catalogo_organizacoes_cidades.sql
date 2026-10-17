-- ============================================================
-- Rede Impulso — catálogo de imobiliárias/construtoras/cidades
--
-- O dono do sistema cadastra, no próprio painel admin, um diretório de
-- cidades e de imobiliárias/construtoras da região. Essas entradas são
-- só etiquetas de referência — nunca viram conta de login, nunca têm
-- painel próprio. O corretor se vincula escolhendo uma entrada do
-- catálogo direto no próprio perfil, sem precisar de aprovação de
-- ninguém (não há ninguém do outro lado pra aprovar).
--
-- Isso é diferente do convite de equipe (migração 0047, imobiliária
-- como CONTA real convidando um corretor) — aquele fluxo continua no
-- banco, só não está mais ligado a nenhuma UI por enquanto.
-- ============================================================

-- Dono do sistema enxerga todo cliente avulso cadastrado por qualquer
-- corretor — é quem acompanha a operação inteira, não uma imobiliária.
create policy "clientes_avulsos: admin le todos"
  on clientes_avulsos for select
  to authenticated
  using (public.is_admin());

create table cidades_catalogo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  uf text not null check (char_length(uf) = 2),
  created_at timestamptz not null default now(),
  unique (nome, uf)
);

comment on table cidades_catalogo is 'Cidades cadastradas pelo admin do sistema — usado em autocomplete/seleção nos formulários (ex.: vínculo do corretor a uma organização).';

alter table cidades_catalogo enable row level security;

create policy "cidades_catalogo: leitura publica"
  on cidades_catalogo for select
  to anon, authenticated
  using (true);

create policy "cidades_catalogo: admin gerencia"
  on cidades_catalogo for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create type organizacao_tipo as enum ('imobiliaria', 'construtora');

create table organizacoes_catalogo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo organizacao_tipo not null,
  cidade_id uuid references cidades_catalogo (id) on delete set null,
  cnpj text,
  created_at timestamptz not null default now()
);

comment on table organizacoes_catalogo is 'Diretório de imobiliárias/construtoras cadastrado pelo admin do sistema — referência, não conta de login. O corretor se vincula direto escolhendo uma entrada, sem aprovação.';

create index on organizacoes_catalogo (cidade_id);
create index on organizacoes_catalogo (tipo);

alter table organizacoes_catalogo enable row level security;

create policy "organizacoes_catalogo: leitura publica"
  on organizacoes_catalogo for select
  to anon, authenticated
  using (true);

create policy "organizacoes_catalogo: admin gerencia"
  on organizacoes_catalogo for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- O corretor grava isso na própria linha (RLS de 0002 já permite:
-- auth.uid() = profile_id edita corretor_perfis) — autosserviço, sem
-- passar por nenhuma aprovação.
alter table corretor_perfis add column organizacao_catalogo_id uuid references organizacoes_catalogo (id) on delete set null;

comment on column corretor_perfis.organizacao_catalogo_id is 'Imobiliária/construtora do catálogo (organizacoes_catalogo) à qual o corretor se vinculou. Diferente de imobiliaria_id (conta real com login, fluxo de convite da migração 0047) — este aqui é autosserviço, sem aprovação, porque a organização aqui é só uma etiqueta.';
