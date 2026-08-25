-- ============================================================
-- Rede Impulso — favoritar imóveis
--
-- Incentivo pra quem só quer buscar (comprador/interessado) criar
-- conta: salvar um anúncio pra ver depois só funciona logado. Tabela
-- simples, privada ao próprio usuário — não é prova social pública
-- como depoimentos/mural.
-- ============================================================

create table favoritos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles (id) on delete cascade,
  imovel_id uuid not null references imoveis (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (usuario_id, imovel_id)
);

create index on favoritos (usuario_id);

alter table favoritos enable row level security;

create policy "favoritos: dono gerencia os proprios"
  on favoritos for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
