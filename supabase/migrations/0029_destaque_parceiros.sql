-- ============================================================
-- Rede Impulso — destaque de parceiro de serviço (monetização)
--
-- Mesmo espírito do destaque de imóvel (migração 0024), mas para o
-- diretório de parceiros (/servicos): quem oferece um serviço paga
-- pra aparecer primeiro na própria categoria, por um número de dias.
-- Preço bem mais baixo que o destaque de imóvel — ticket pequeno,
-- pensado pra prestador autônomo (pintor, eletricista etc.), não
-- pra imobiliária. Só isso, sem banner nem anúncio intercalado no
-- meio da página — ver decisão registrada na Radiografia da
-- Concorrência ("o que não vale a pena copiar": densidade de
-- anúncio pago da OLX).
-- ============================================================

alter table parceiros_servico add column destaque_ate timestamptz;

create table parceiro_destaque_pagamentos (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references parceiros_servico (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  dias int not null,
  valor numeric(10, 2) not null,
  mp_preference_id text unique,
  mp_payment_id text,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

comment on table parceiro_destaque_pagamentos is 'Uma linha por tentativa de compra de destaque de parceiro de servico. status: pendente | aprovado | rejeitado — espelha o status do pagamento no Mercado Pago.';

create index on parceiro_destaque_pagamentos (parceiro_id);
create index on parceiro_destaque_pagamentos (mp_preference_id);

alter table parceiro_destaque_pagamentos enable row level security;

create policy "parceiro_destaque_pagamentos: dono ve as proprias"
  on parceiro_destaque_pagamentos for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "parceiro_destaque_pagamentos: dono do parceiro cria a propria compra"
  on parceiro_destaque_pagamentos for insert
  to authenticated
  with check (
    auth.uid() = profile_id
    and exists (select 1 from parceiros_servico p where p.id = parceiro_id and p.profile_id = auth.uid())
  );

-- Mesmo tradeoff de seguranca documentado em confirmar_pagamento_destaque
-- (migracao 0024): function publica, protegida por precisar de um uuid
-- existente, com o webhook sempre confirmando o status direto na API do
-- Mercado Pago antes de chamar isto.
create function public.confirmar_pagamento_destaque_parceiro(
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
  v_pagamento parceiro_destaque_pagamentos%rowtype;
begin
  select * into v_pagamento
  from parceiro_destaque_pagamentos
  where id = p_pagamento_id;

  if not found then
    return;
  end if;

  update parceiro_destaque_pagamentos
    set status = p_status, mp_payment_id = p_payment_id
    where id = v_pagamento.id;

  if p_status = 'aprovado' then
    update parceiros_servico
      set destaque_ate = greatest(coalesce(destaque_ate, now()), now()) + (v_pagamento.dias || ' days')::interval
      where id = v_pagamento.parceiro_id;
  end if;
end;
$$;

comment on function public.confirmar_pagamento_destaque_parceiro is 'Chamada pelo webhook do Mercado Pago (sem sessao de usuario) para confirmar ou rejeitar uma compra de destaque de parceiro e, se aprovada, estender parceiros_servico.destaque_ate.';

grant execute on function public.confirmar_pagamento_destaque_parceiro(uuid, text, text) to anon, authenticated;
