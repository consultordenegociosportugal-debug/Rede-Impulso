-- ============================================================
-- Rede Impulso — expor o selo de verificacao do vendedor na vitrine
--
-- profiles ja tinha leitura publica para corretor/imobiliaria/cartorio
-- (migracao 0002), mas nao para vendedor — role mais comum entre quem
-- publica um imovel individualmente. Sem isso, imoveis/[id]/page.tsx
-- nao conseguia nem ler o nome nem o verification_status de quem
-- anunciou, entao a pagina nunca mostrava selo de confianca nenhum
-- (achado do benchmark com o Mercado Livre: "identidade verificada"
-- aparece logo abaixo do titulo, antes do preco).
--
-- Mesmo principio da migracao 0002: uma vez que o imovel esta
-- publicado, ele ja e publico de qualquer forma — expor quem o
-- vendeu segue a mesma logica de "vitrine sem login".
-- ============================================================

create policy "profiles: leitura publica do vendedor de imovel publicado"
  on profiles for select
  to anon, authenticated
  using (
    exists (
      select 1 from imoveis i
      where i.vendedor_id = profiles.id and i.status = 'publicado'
    )
  );
