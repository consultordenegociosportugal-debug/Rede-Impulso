-- ============================================================
-- Rede Impulso — restringe tipo e tamanho de arquivo nos buckets de
-- upload
--
-- Nenhum dos dois buckets de upload (perfil-fotos, documentos-
-- verificacao) tinha restrição nenhuma de tipo de arquivo ou tamanho —
-- nem no código (o `accept="image/*"` do <input type="file"> é só uma
-- dica da interface, trivial de ignorar), nem no bucket em si.
--
-- perfil-fotos é PÚBLICO (bucket criado com public=true, migração
-- 0022) e o caminho salvo usa a EXTENSÃO que veio do nome do arquivo
-- escolhido pela pessoa (editar-perfil/form.tsx), sem checar se bate
-- com o conteúdo de verdade. Sem essa trava, dava pra subir um SVG com
-- `<script>` embutido como "foto de perfil" — SVG casa com
-- accept="image/*" e vira XSS clássico se alguém abrir a imagem direto
-- (bem documentado: SVG não é só imagem, é um documento que pode
-- conter script) — ou qualquer outro arquivo, hospedado de graça e
-- publicamente sob o domínio do Supabase da Rede Impulso.
--
-- documentos-verificacao não é público, mas é aberto pelo ADMIN na
-- revisão (/admin) — o mesmo tipo de arquivo malicioso ali mira quem
-- revisa documentos, não o público em geral.
--
-- allowed_mime_types aqui é só a extensão (sem svg) + pdf pros
-- documentos; file_size_limit em bytes.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880 -- 5 MB
where id = 'perfil-fotos';

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    file_size_limit = 10485760 -- 10 MB
where id = 'documentos-verificacao';
