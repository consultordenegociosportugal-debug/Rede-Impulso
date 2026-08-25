-- ============================================================
-- Rede Impulso — comodidades do imóvel + denúncia de anúncio
--
-- Completa o levantamento da OLX: lista de comodidades (checklist
-- simples, sem virar um catálogo de amenidades gigante) e canal de
-- denúncia — captura o relato agora, revisão fica pra quando o
-- painel de admin crescer (mesmo padrão dos documentos).
-- ============================================================

alter table imoveis add column comodidades text[] not null default '{}';

create table denuncias_imovel (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete cascade,
  denunciante_id uuid references profiles (id) on delete set null,
  motivo text not null,
  detalhes text,
  created_at timestamptz not null default now()
);

create index on denuncias_imovel (imovel_id);

alter table denuncias_imovel enable row level security;

create policy "denuncias_imovel: qualquer autenticado denuncia"
  on denuncias_imovel for insert
  to authenticated
  with check (auth.uid() = denunciante_id);

create policy "denuncias_imovel: admin le todas"
  on denuncias_imovel for select
  to authenticated
  using (public.is_admin());
