-- ============================================================
-- Rede Impulso — anuncio em destaque (monetizacao)
--
-- Vendedor, corretor ou imobiliaria paga para o proprio anuncio
-- aparecer primeiro na vitrine e na home por um numero de dias.
-- Checkout via Mercado Pago (Checkout Pro) — ver src/lib/mercadopago.ts.
--
-- destaque_ate: null = nunca foi destacado. Timestamp no futuro =
-- destaque ativo ate aquela data. Timestamp no passado = destaque
-- expirado (a query de listagem ja ignora, nao precisa de job de
-- limpeza).
-- ============================================================

alter table imoveis add column destaque_ate timestamptz;

create table destaque_pagamentos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  dias int not null,
  valor numeric(10, 2) not null,
  mp_preference_id text unique,
  mp_payment_id text,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

comment on table destaque_pagamentos is 'Uma linha por tentativa de compra de destaque. status: pendente | aprovado | rejeitado — espelha o status do pagamento no Mercado Pago.';
comment on column destaque_pagamentos.mp_preference_id is 'Id da preferencia de checkout no Mercado Pago. E o que liga a notificacao do webhook de volta a esta compra.';

create index on destaque_pagamentos (imovel_id);
create index on destaque_pagamentos (mp_preference_id);

alter table destaque_pagamentos enable row level security;

create policy "destaque_pagamentos: dono ve as proprias"
  on destaque_pagamentos for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "destaque_pagamentos: dono do imovel cria a propria compra"
  on destaque_pagamentos for insert
  to authenticated
  with check (
    auth.uid() = profile_id
    and exists (select 1 from imoveis i where i.id = imovel_id and i.vendedor_id = auth.uid())
  );

-- ---------- confirmacao do pagamento (chamada pelo webhook) ----------
--
-- O webhook do Mercado Pago e servidor-a-servidor: nao existe sessao
-- de usuario nem cookie, entao nao da pra usar as policies acima pra
-- atualizar o status. Em vez de introduzir uma service role key na
-- app (mais um segredo pra vazar), a confirmacao roda como uma
-- function security definer, no mesmo molde de revisar_perfil
-- (migracao 0011) e corretor_responsavel_imovel (migracao 0020).
--
-- Identificador usado para casar a notificacao com a compra:
-- `external_reference` mandado ao criar a preferencia e o proprio
-- `destaque_pagamentos.id` (uuid) — nao precisa de uma segunda coluna
-- so pra isso.
--
-- TRADEOFF DE SEGURANCA (v1, mesmo espirito do comentario em
-- google_calendar_conexoes na migracao 0020): a function e
-- executavel por qualquer chave anon, protegida so por precisar
-- acertar um p_pagamento_id existente — um uuid gerado pelo Postgres,
-- nao sequencial nem adivinhavel. O webhook, antes de chamar isto,
-- sempre confere o status do pagamento direto na API do Mercado Pago
-- (nunca confia so no corpo da notificacao).
create function public.confirmar_pagamento_destaque(
  p_pagamento_id uuid,
  p_payment_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pagamento destaque_pagamentos%rowtype;
begin
  select * into v_pagamento
  from destaque_pagamentos
  where id = p_pagamento_id;

  if not found then
    return;
  end if;

  update destaque_pagamentos
    set status = p_status, mp_payment_id = p_payment_id
    where id = v_pagamento.id;

  if p_status = 'aprovado' then
    update imoveis
      set destaque_ate = greatest(coalesce(destaque_ate, now()), now()) + (v_pagamento.dias || ' days')::interval
      where id = v_pagamento.imovel_id;
  end if;
end;
$$;

comment on function public.confirmar_pagamento_destaque is 'Chamada pelo webhook do Mercado Pago (sem sessao de usuario) para confirmar ou rejeitar uma compra de destaque e, se aprovada, estender imoveis.destaque_ate.';

grant execute on function public.confirmar_pagamento_destaque(uuid, text, text) to anon, authenticated;
