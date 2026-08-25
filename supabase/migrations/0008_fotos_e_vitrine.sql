-- ============================================================
-- Rede Impulso — fotos do imovel + bucket de storage
--
-- imovel_fotos ja existia (migracao 0001) com policies de leitura
-- publica e escrita do vendedor (migracao 0002), mas faltava o bucket
-- de storage em si — sem ele o upload nao tem onde salvar o arquivo.
-- Bucket publico (igual "vitrine"): uma vez publicado, a foto e
-- publica de qualquer forma, entao servir direto por URL publica
-- evita ter que gerar signed URL a cada carregamento da lista de
-- imoveis.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('imovel-fotos', 'imovel-fotos', true)
on conflict (id) do nothing;

-- Convencao de caminho: imovel-fotos/{vendedor_id}/{imovel_id}/{arquivo}
create policy "imovel-fotos: vendedor gerencia as do proprio imovel"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'imovel-fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'imovel-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
