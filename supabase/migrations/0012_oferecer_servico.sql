-- ============================================================
-- Rede Impulso — cliente pode se oferecer como prestador de serviço
--
-- parceiros_servico até aqui era só diretório curado (seed da
-- migração 0006), sem dono. Agora um profile pode se cadastrar como
-- prestador — mesma lógica de "decidiu vender" do publicar-imovel:
-- vira role=vendedor e passa a precisar do documento de identidade
-- (TIPOS_POR_ROLE já cobre isso, sem migração adicional).
-- ============================================================

alter table parceiros_servico add column profile_id uuid references profiles (id) on delete cascade;

create index on parceiros_servico (profile_id);

create policy "parceiros_servico: dono cria o proprio"
  on parceiros_servico for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "parceiros_servico: dono edita o proprio"
  on parceiros_servico for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "parceiros_servico: dono ve o proprio mesmo inativo"
  on parceiros_servico for select
  to authenticated
  using (auth.uid() = profile_id);
