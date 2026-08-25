-- ============================================================
-- Rede Impulso — bucket de storage para documentos_verificacao
--
-- A tabela documentos_verificacao e suas policies já existiam desde
-- a migração 0001/0002, mas nenhuma tela real fazia upload — ficava
-- como preview decorativo ("em breve"). Documentos são sensíveis
-- (RG, CNPJ, CRECI), então o bucket é privado, diferente de
-- imovel-fotos. Convenção de caminho: {profile_id}/{tipo}-{arquivo}.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documentos-verificacao', 'documentos-verificacao', false)
on conflict (id) do nothing;

create policy "documentos-verificacao: dono envia e le os proprios"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documentos-verificacao' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documentos-verificacao' and (storage.foldername(name))[1] = auth.uid()::text);
