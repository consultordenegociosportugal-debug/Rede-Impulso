-- ============================================================
-- Rede Impulso — aprovação de vínculo corretor↔organização e
-- caminho para um corretor virar gestor também
--
-- Problema: corretor_perfis.organizacao_catalogo_id (migração 0053)
-- sempre foi autosserviço puro — o corretor escolhe e grava direto
-- em editar-perfil/vincular-organizacao.tsx, sem o gestor daquela
-- organização saber ou aprovar nada. Isso significa que qualquer
-- corretor podia se declarar vinculado a qualquer construtora/
-- imobiliária do catálogo e aparecer no painel do gestor dela sem
-- nenhuma verificação — risco real num piloto onde o gestor confia
-- nesses números pra decisão de negócio.
--
-- Solução: o vínculo corretor→organização e o pedido "virar gestor"
-- passam a ser uma SOLICITAÇÃO pendente, que só um gestor da própria
-- organização pode aprovar/recusar — via function security definer,
-- mesmo padrão de revisar_documento/revisar_perfil (migração 0011).
-- Desvincular continua imediato e autosserviço (reduzir acesso nunca
-- precisa de aprovação, só aumentar).
-- ============================================================

create type solicitacao_vinculo_tipo as enum ('corretor', 'gestor');
create type solicitacao_vinculo_status as enum ('pendente', 'aprovada', 'recusada', 'cancelada');

create table solicitacoes_vinculo (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references profiles (id) on delete cascade,
  organizacao_catalogo_id uuid not null references organizacoes_catalogo (id) on delete cascade,
  tipo solicitacao_vinculo_tipo not null,
  status solicitacao_vinculo_status not null default 'pendente',
  respondida_por uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  respondida_em timestamptz
);

comment on table solicitacoes_vinculo is
  'Pedido de vínculo (corretor se junta à organização) ou de promoção (corretor vira também gestor dela), pendente até um gestor da organização aprovar ou recusar.';

-- Nunca duas solicitações pendentes do mesmo tipo, da mesma pessoa,
-- pra mesma organização — evita fila duplicada por clique repetido.
create unique index solicitacoes_vinculo_pendente_unica
  on solicitacoes_vinculo (solicitante_id, organizacao_catalogo_id, tipo)
  where status = 'pendente';

create index solicitacoes_vinculo_por_organizacao
  on solicitacoes_vinculo (organizacao_catalogo_id, status);

alter table solicitacoes_vinculo enable row level security;

-- Criar a solicitação é autosserviço (é só um pedido, não dá
-- privilégio nenhum sozinho) — mas com guarda-corpo pra não aceitar
-- qualquer coisa:
--   - tipo 'corretor': só quem já tem corretor_perfis pode pedir.
--   - tipo 'gestor': só quem JÁ é corretor APROVADO daquela mesma
--     organização pode pedir pra virar gestor dela, e só se ainda
--     não for gestor de ninguém (gestor_perfis é 1:1 por pessoa).
create policy "solicitacoes_vinculo: solicitante cria a propria"
  on solicitacoes_vinculo for insert
  to authenticated
  with check (
    solicitante_id = auth.uid()
    and (
      (
        tipo = 'corretor'
        and exists (select 1 from corretor_perfis where profile_id = auth.uid())
      )
      or (
        tipo = 'gestor'
        and exists (
          select 1 from corretor_perfis
          where profile_id = auth.uid()
            and organizacao_catalogo_id = solicitacoes_vinculo.organizacao_catalogo_id
        )
        and not exists (select 1 from gestor_perfis where profile_id = auth.uid())
      )
    )
  );

create policy "solicitacoes_vinculo: solicitante ve as proprias"
  on solicitacoes_vinculo for select
  to authenticated
  using (solicitante_id = auth.uid());

create policy "solicitacoes_vinculo: gestor ve da sua organizacao"
  on solicitacoes_vinculo for select
  to authenticated
  using (
    exists (
      select 1 from gestor_perfis gp
      where gp.profile_id = auth.uid()
        and gp.organizacao_catalogo_id = solicitacoes_vinculo.organizacao_catalogo_id
    )
  );

create policy "solicitacoes_vinculo: admin ve tudo"
  on solicitacoes_vinculo for select
  to authenticated
  using (public.is_admin());

-- Sem policy de update/delete: toda transição de estado passa pelas
-- functions abaixo (security definer), nunca por PATCH direto via
-- REST — é exatamente o ponto de ter uma aprovação de verdade.

-- Aprova ou recusa — só quem é gestor da organização do pedido.
create function public.responder_solicitacao_vinculo(p_solicitacao_id uuid, p_aprovar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sol solicitacoes_vinculo%rowtype;
begin
  select * into v_sol from solicitacoes_vinculo where id = p_solicitacao_id for update;

  if not found then
    raise exception 'Solicitação não encontrada';
  end if;

  if v_sol.status <> 'pendente' then
    raise exception 'Esta solicitação já foi respondida';
  end if;

  if not exists (
    select 1 from gestor_perfis
    where profile_id = auth.uid() and organizacao_catalogo_id = v_sol.organizacao_catalogo_id
  ) then
    raise exception 'Você não é gestor desta organização';
  end if;

  if p_aprovar then
    if v_sol.tipo = 'corretor' then
      update corretor_perfis
      set organizacao_catalogo_id = v_sol.organizacao_catalogo_id
      where profile_id = v_sol.solicitante_id;
    else
      insert into gestor_perfis (profile_id, organizacao_catalogo_id)
      values (v_sol.solicitante_id, v_sol.organizacao_catalogo_id)
      on conflict (profile_id) do update set organizacao_catalogo_id = excluded.organizacao_catalogo_id;
    end if;
    update solicitacoes_vinculo
    set status = 'aprovada', respondida_por = auth.uid(), respondida_em = now()
    where id = p_solicitacao_id;
  else
    update solicitacoes_vinculo
    set status = 'recusada', respondida_por = auth.uid(), respondida_em = now()
    where id = p_solicitacao_id;
  end if;
end;
$$;

grant execute on function public.responder_solicitacao_vinculo(uuid, boolean) to authenticated;

-- Cancela o próprio pedido ainda pendente (desistiu, ou selecionou
-- errado) — só o solicitante, só enquanto não foi respondido.
create function public.cancelar_solicitacao_vinculo(p_solicitacao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update solicitacoes_vinculo
  set status = 'cancelada'
  where id = p_solicitacao_id and solicitante_id = auth.uid() and status = 'pendente';

  if not found then
    raise exception 'Solicitação não encontrada ou já respondida';
  end if;
end;
$$;

grant execute on function public.cancelar_solicitacao_vinculo(uuid) to authenticated;

-- Desvincular é o caminho inverso (reduz acesso) — continua
-- autosserviço, sem aprovação de ninguém, mas agora via function em
-- vez de UPDATE direto, já que a coluna deixa de ter grant aberto.
create function public.desvincular_organizacao_corretor()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update corretor_perfis set organizacao_catalogo_id = null where profile_id = auth.uid();
end;
$$;

grant execute on function public.desvincular_organizacao_corretor() to authenticated;

-- Fecha a porta que esta migração resolve: só as functions acima (ou
-- o backend com service role) podem mudar organizacao_catalogo_id a
-- partir de agora — grant sem essa coluna.
revoke update on corretor_perfis from authenticated;
grant update (profile_id, creci, bairros_atuacao, cidades_atuacao, cpf)
  on corretor_perfis to authenticated;

-- Dados já existentes (piloto em teste) continuam valendo — grava o
-- histórico como se já tivesse passado por uma aprovação, pra não
-- derrubar vínculo de quem já estava testando o painel do gestor.
insert into solicitacoes_vinculo (solicitante_id, organizacao_catalogo_id, tipo, status, respondida_em)
select profile_id, organizacao_catalogo_id, 'corretor', 'aprovada', now()
from corretor_perfis
where organizacao_catalogo_id is not null;
