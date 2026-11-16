-- ============================================================
-- Rede Impulso — leads entregues pelo gestor ao corretor
--
-- Diferente de clientes_avulsos (o CORRETOR cadastra um cliente de
-- balcão e já agenda na mesma hora): aqui é o GESTOR de vendas da
-- imobiliária/construtora que entrega um lead a um corretor específico
-- da própria organização, e acompanha o funil — novo, contatado,
-- agendado, convertido (com valor da venda) ou perdido. Só o corretor
-- dono do lead muda o status (decisão do dono do produto: o gestor
-- acompanha em tela/relatório, não edita o funil de quem está na
-- linha de frente com o cliente).
-- ============================================================

create type lead_status as enum ('novo', 'contatado', 'agendado', 'convertido', 'perdido');

create table leads (
  id uuid primary key default gen_random_uuid(),
  organizacao_catalogo_id uuid not null references organizacoes_catalogo (id) on delete cascade,
  corretor_id uuid not null references profiles (id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  origem text,
  observacoes text,
  status lead_status not null default 'novo',
  visita_id uuid references visitas (id) on delete set null,
  valor_venda numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leads is 'Lead entregue pelo gestor de vendas a um corretor vinculado à sua organização. Funil: novo -> contatado -> agendado -> convertido (valor_venda preenchido) ou perdido.';

create index on leads (corretor_id);
create index on leads (organizacao_catalogo_id);
create index on leads (visita_id);

alter table leads enable row level security;

create policy "leads: gestor le da sua organizacao"
  on leads for select
  to authenticated
  using (
    exists (
      select 1 from gestor_perfis gp
      where gp.profile_id = auth.uid()
        and gp.organizacao_catalogo_id = leads.organizacao_catalogo_id
    )
  );

-- O gestor só consegue atribuir a um corretor que já é da própria
-- organização — não dá pra criar um lead "solto" nem entregar pra
-- corretor de fora.
create policy "leads: gestor cadastra pra corretor da sua organizacao"
  on leads for insert
  to authenticated
  with check (
    exists (
      select 1 from gestor_perfis gp
      join corretor_perfis cp on cp.organizacao_catalogo_id = gp.organizacao_catalogo_id
      where gp.profile_id = auth.uid()
        and gp.organizacao_catalogo_id = leads.organizacao_catalogo_id
        and cp.profile_id = leads.corretor_id
    )
  );

create policy "leads: corretor le os proprios"
  on leads for select
  to authenticated
  using (auth.uid() = corretor_id);

create policy "leads: corretor atualiza o funil dos proprios"
  on leads for update
  to authenticated
  using (auth.uid() = corretor_id)
  with check (auth.uid() = corretor_id);

create policy "leads: admin gerencia"
  on leads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
