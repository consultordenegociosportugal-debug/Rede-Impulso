-- ============================================================
-- Rede Impulso — bucket de storage para foto de perfil
--
-- profiles.foto_url ja existia (migracao 0001) e ja e preenchido pelo
-- login social (migracao 0021), mas nao havia bucket para o usuario
-- enviar sua propria foto pela pagina /editar-perfil. Bucket publico
-- (igual imovel-fotos, migracao 0008): a foto de perfil e sempre
-- publica de qualquer forma, entao serve por URL publica direto.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('perfil-fotos', 'perfil-fotos', true)
on conflict (id) do nothing;

-- Convencao de caminho: perfil-fotos/{user_id}/{arquivo}
create policy "perfil-fotos: usuario gerencia a propria foto"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'perfil-fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'perfil-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
