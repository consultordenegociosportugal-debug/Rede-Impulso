-- ============================================================
-- Rede Impulso — agendamento direto cliente ↔ corretor
--
-- Pivô de produto: o foco agora é só isto, no espírito do AppBarber —
-- cliente agenda direto com um corretor (sem passar por um imóvel), e
-- o corretor também pode cadastrar um cliente de "balcão" (nome e
-- telefone, sem login nenhum) e já sair com a visita confirmada.
--
-- Até aqui toda `visita` (migração 0020) dependia de um `imovel_id`
-- (not null) e o `corretor_id` sempre vinha de
-- `corretor_responsavel_imovel()`. Esta migração não apaga nada disso
-- — só afrouxa as colunas pra deixar `visitas` existir sem imóvel.
-- ============================================================

-- Cliente "avulso": o corretor cadastra nome/telefone e já agenda, sem
-- o cliente precisar criar conta nenhuma. Separado de `profiles` de
-- propósito — `profiles.id` referencia `auth.users` e não queremos
-- mexer nessa fundação só pra isto.
create table clientes_avulsos (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles (id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  created_at timestamptz not null default now()
);

comment on table clientes_avulsos is 'Cliente cadastrado diretamente pelo corretor (sem login) — agenda de contatos de balcão, igual o AppBarber trata cliente de passagem.';

create index on clientes_avulsos (corretor_id);

alter table clientes_avulsos enable row level security;

create policy "clientes_avulsos: corretor gerencia os seus"
  on clientes_avulsos for all
  to authenticated
  using (auth.uid() = corretor_id)
  with check (auth.uid() = corretor_id);

-- Visita passa a poder existir sem imóvel (agendamento direto) e sem
-- comprador autenticado (cliente avulso) — exatamente um dos dois
-- lados do cliente precisa estar preenchido.
alter table visitas alter column imovel_id drop not null;
alter table visitas alter column comprador_id drop not null;

alter table visitas add column cliente_avulso_id uuid references clientes_avulsos (id) on delete cascade;

comment on column visitas.cliente_avulso_id is 'Preenchido quando quem agenda é o próprio corretor, para um cliente sem conta (ver clientes_avulsos). Mutuamente exclusivo com comprador_id.';

alter table visitas add constraint visitas_um_cliente
  check (((comprador_id is not null)::int + (cliente_avulso_id is not null)::int) = 1);

-- O trigger de 0020 sempre sobrescrevia `corretor_id` a partir do
-- imóvel — com `imovel_id` nulo, `corretor_responsavel_imovel(null)`
-- devolveria null e apagaria o corretor que o insert já definiu. Agora
-- só mexe em `corretor_id` quando a visita é mesmo de um imóvel.
create or replace function public.visitas_define_corretor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.imovel_id is not null then
    new.corretor_id = public.corretor_responsavel_imovel(new.imovel_id);
  end if;
  return new;
end;
$$;

-- Novo caminho de insert: o corretor agenda em nome de um cliente
-- avulso seu. O caminho do cliente agendando direto com um corretor
-- (sem imóvel) já cai na policy "visitas: interessado cria as
-- proprias" de 0020, que não exige imovel_id.
create policy "visitas: corretor agenda para cliente avulso"
  on visitas for insert
  to authenticated
  with check (auth.uid() = corretor_id and cliente_avulso_id is not null);

-- Sem isso, o corretor não enxergava nome/telefone de quem agendou
-- uma visita sem imóvel (o join original exigia um imóvel existir).
create or replace function public.e_contraparte_de_visita(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from visitas v
    left join imoveis i on i.id = v.imovel_id
    where v.comprador_id = p_profile_id
      and (v.corretor_id = auth.uid() or i.vendedor_id = auth.uid())
  );
$$;
