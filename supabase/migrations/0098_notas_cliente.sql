-- ============================================================
-- Rede Impulso — notas do corretor sobre um cliente
--
-- Primeira peça do CRM que o sistema vai virando aos poucos (pedido
-- do usuário em 2026-11-19): timeline simples de anotações livres por
-- cliente, pra não depender da memória do corretor ("já falei sobre
-- preço com ele?"). De propósito só texto livre + data — sem estágio
-- de funil, sem categorias: começa pequeno, só isso, pra ver se os
-- corretores realmente usam antes de crescer.
-- ============================================================

create table clientes_notas (
  id uuid primary key default gen_random_uuid(),
  cliente_avulso_id uuid not null references clientes_avulsos (id) on delete cascade,
  -- Denormalizado (igual clientes_avulsos.corretor_id) pra RLS não
  -- precisar de join — mesmo padrão já usado nessa tabela.
  corretor_id uuid not null references profiles (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

comment on table clientes_notas is 'Anotações livres do corretor sobre um cliente avulso — timeline simples, sem estágio de funil.';

create index on clientes_notas (cliente_avulso_id);
create index on clientes_notas (corretor_id);

alter table clientes_notas enable row level security;

create policy "clientes_notas: corretor gerencia as suas"
  on clientes_notas for all
  to authenticated
  using (auth.uid() = corretor_id)
  with check (auth.uid() = corretor_id);
