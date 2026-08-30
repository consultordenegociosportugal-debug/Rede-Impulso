-- ============================================================
-- Rede Impulso — Plano Profissional (assinatura recorrente)
--
-- Corretor e imobiliaria publicam ate 2 imoveis ativos de graca, pra
-- sempre — sem assinar nada. Do 3o em diante, precisa de uma
-- assinatura ativa de um dos planos (5, 15 ou 20 anuncios). Vendedor
-- individual (quem publica o proprio imovel) nao e afetado por este
-- limite: a trava so vale pra quem tem role 'corretor' ou
-- 'imobiliaria' — mesmo espirito do "plano profissional" do OLX, que
-- tambem so restringe quem publica em volume.
--
-- Cobranca recorrente via Mercado Pago (preapproval) — ver
-- src/lib/mercadopago.ts. O webhook confirma a assinatura do mesmo
-- jeito que confirmar_pagamento_destaque confirma o Destaque
-- (migracao 0024): function security definer, sem service role key.
-- ============================================================

create table assinaturas_plano (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  plano text not null,
  limite int not null,
  valor numeric(10, 2) not null,
  mp_preapproval_id text unique,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table assinaturas_plano is 'Assinaturas do Plano Profissional. status: pendente | ativa | pausada | cancelada — espelha o status do preapproval no Mercado Pago.';
comment on column assinaturas_plano.limite is 'Quantidade de imoveis ativos (publicado + em_negociacao) que esta assinatura libera.';

create index on assinaturas_plano (profile_id);
create index on assinaturas_plano (mp_preapproval_id);

alter table assinaturas_plano enable row level security;

create policy "assinaturas_plano: dono ve as proprias"
  on assinaturas_plano for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "assinaturas_plano: dono cria a propria"
  on assinaturas_plano for insert
  to authenticated
  with check (auth.uid() = profile_id);

-- Mesmo tradeoff de seguranca documentado em confirmar_pagamento_destaque
-- (migracao 0024): function publica, protegida por precisar de um uuid
-- existente, com o webhook sempre confirmando o status direto na API do
-- Mercado Pago antes de chamar isto.
create function public.confirmar_assinatura(p_assinatura_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update assinaturas_plano
    set status = p_status, updated_at = now()
    where id = p_assinatura_id;
end;
$$;

comment on function public.confirmar_assinatura is 'Chamada pelo webhook de assinatura do Mercado Pago (sem sessao de usuario) para atualizar o status da assinatura.';

grant execute on function public.confirmar_assinatura(uuid, text) to anon, authenticated;

-- ---------- limite de anuncios ativos ----------

create function public.limite_anuncios_profissional(p_profile_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select limite from assinaturas_plano
      where profile_id = p_profile_id and status = 'ativa'
      order by limite desc
      limit 1
    ),
    2
  );
$$;

comment on function public.limite_anuncios_profissional is 'Quantos imoveis ativos um profissional (corretor/imobiliaria) pode ter. 2 de graca sem assinatura; o limite da assinatura ativa, se houver.';

create function public.checar_limite_anuncios()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_limite int;
  v_ativos int;
begin
  if new.status not in ('publicado', 'em_negociacao') then
    return new;
  end if;

  -- So verifica quando o imovel esta ENTRANDO num status ativo. Editar um
  -- imovel que ja estava publicado/em_negociacao (preco, fotos, descricao)
  -- nunca deve travar so por causa do limite — senao alguem que ja estava
  -- acima do limite antes deste recurso existir ficaria sem conseguir nem
  -- corrigir um erro de digitacao no proprio anuncio.
  if tg_op = 'UPDATE' and old.status in ('publicado', 'em_negociacao') then
    return new;
  end if;

  select role into v_role from profiles where id = new.vendedor_id;
  if v_role is null or v_role not in ('corretor', 'imobiliaria') then
    return new;
  end if;

  v_limite := public.limite_anuncios_profissional(new.vendedor_id);

  select count(*) into v_ativos
  from imoveis
  where vendedor_id = new.vendedor_id
    and status in ('publicado', 'em_negociacao')
    and id <> new.id;

  if v_ativos >= v_limite then
    raise exception 'Você atingiu o limite de % imóveis ativos do seu plano. Assine ou amplie o Plano Profissional em /planos para publicar mais.', v_limite;
  end if;

  return new;
end;
$$;

comment on function public.checar_limite_anuncios is 'Trava publicacao de imovel acima do limite do plano — so afeta corretor e imobiliaria, nunca vendedor individual.';

create trigger trg_checar_limite_anuncios
  before insert or update on imoveis
  for each row execute function public.checar_limite_anuncios();
