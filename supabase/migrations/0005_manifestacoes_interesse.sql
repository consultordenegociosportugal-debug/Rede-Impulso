-- ============================================================
-- Rede Impulso — "tirei uma foto, existe imóvel aqui?"
--
-- Feature: cliente fotografa um imóvel na rua; o app usa a
-- localização do celular (não reconhecimento visual da foto) para
-- achar imóveis publicados por perto. Se não achar nada, registra o
-- interesse (compra ou aluguel) para follow-up depois.
--
-- Isso também introduz aluguel como finalidade — até aqui o produto
-- só cobria compra/venda.
-- ============================================================

create type imovel_finalidade as enum ('venda', 'aluguel');
create type negocio_tipo as enum ('venda', 'locacao');
create type interesse_status as enum ('pendente', 'atendido', 'descartado');

alter table imoveis add column finalidade imovel_finalidade not null default 'venda';
alter table imoveis add column latitude numeric(10,7);
alter table imoveis add column longitude numeric(10,7);
create index on imoveis (latitude, longitude);

alter table negocios add column tipo negocio_tipo not null default 'venda';

-- Registro de "vi um imóvel, tenho interesse" quando não existe
-- publicação correspondente perto da localização informada. Fica
-- privado a quem manifestou por enquanto — abrir isso para
-- corretores da região é uma decisão de produto para uma próxima
-- etapa.
create table manifestacoes_interesse (
  id uuid primary key default gen_random_uuid(),
  interessado_id uuid not null references profiles (id) on delete cascade,
  finalidade imovel_finalidade not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  endereco_aproximado text,
  foto_url text,
  status interesse_status not null default 'pendente',
  created_at timestamptz not null default now()
);

alter table manifestacoes_interesse enable row level security;

create policy "manifestacoes_interesse: interessado ve e cria as proprias"
  on manifestacoes_interesse for all
  to authenticated
  using (auth.uid() = interessado_id)
  with check (auth.uid() = interessado_id);

-- Busca por proximidade usando fórmula de haversine (raio da Terra em
-- metros) — sem depender de PostGIS. Só enxerga o que já é público
-- (imoveis publicados), então não precisa de security definer.
create function public.imoveis_proximos(p_lat numeric, p_lng numeric, p_raio_metros numeric default 150)
returns setof imoveis
language sql
stable
set search_path = public
as $$
  select *
  from imoveis
  where status = 'publicado'
    and latitude is not null
    and longitude is not null
    and (
      6371000 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(p_lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(latitude))
        ))
      )
    ) <= p_raio_metros;
$$;

-- Storage para as fotos de manifestação de interesse. Cada arquivo
-- fica em manifestacoes-fotos/{uid}/{arquivo} — a policy só libera
-- dentro da própria pasta do usuário.
insert into storage.buckets (id, name, public)
values ('manifestacoes-fotos', 'manifestacoes-fotos', false)
on conflict (id) do nothing;

create policy "manifestacoes-fotos: dono envia e le as proprias"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'manifestacoes-fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'manifestacoes-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
