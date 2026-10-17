-- ============================================================
-- Rede Impulso — perfil de gestor + acesso às métricas da organização
--
-- Depende da 0055 (enum visita_status.nao_compareceu e
-- user_role.gestor) já estar aplicada e confirmada.
--
-- gestor_perfis segue o mesmo padrão de corretor_perfis/
-- imobiliaria_perfis/construtora_perfis: cada papel com campos
-- próprios ganha sua própria tabela de extensão 1:1, em vez de
-- acumular colunas condicionais em profiles.
-- ============================================================

create table gestor_perfis (
  profile_id uuid primary key references profiles (id) on delete cascade,
  organizacao_catalogo_id uuid not null references organizacoes_catalogo (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table gestor_perfis is 'Extensão 1:1 de profiles para role=gestor — qual organização do catálogo ele gerencia.';

alter table gestor_perfis enable row level security;

create policy "gestor_perfis: leitura publica"
  on gestor_perfis for select
  to anon, authenticated
  using (true);

create policy "gestor_perfis: dono gerencia o proprio"
  on gestor_perfis for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ---------- Leitura de métricas, escopada pela organização do gestor ----------

create policy "visitas: gestor le dos corretores da sua organizacao"
  on visitas for select
  to authenticated
  using (
    exists (
      select 1
      from gestor_perfis gp
      join corretor_perfis cp on cp.organizacao_catalogo_id = gp.organizacao_catalogo_id
      where gp.profile_id = auth.uid()
        and cp.profile_id = visitas.corretor_id
    )
  );

create policy "clientes_avulsos: gestor le dos corretores da sua organizacao"
  on clientes_avulsos for select
  to authenticated
  using (
    exists (
      select 1
      from gestor_perfis gp
      join corretor_perfis cp on cp.organizacao_catalogo_id = gp.organizacao_catalogo_id
      where gp.profile_id = auth.uid()
        and cp.profile_id = clientes_avulsos.corretor_id
    )
  );

create policy "nps_respostas: gestor le da sua organizacao"
  on nps_respostas for select
  to authenticated
  using (
    exists (
      select 1
      from gestor_perfis gp
      join corretor_perfis cp on cp.organizacao_catalogo_id = gp.organizacao_catalogo_id
      join visitas v on v.corretor_id = cp.profile_id
      where gp.profile_id = auth.uid()
        and v.id = nps_respostas.visita_id
    )
  );
