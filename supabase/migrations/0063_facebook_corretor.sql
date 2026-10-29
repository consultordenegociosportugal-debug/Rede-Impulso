-- O corretor já cadastra Instagram (profiles.rede_social) em
-- /editar-perfil, mas isso nunca aparece no perfil público — vira um
-- dado que ninguém vê. O pedido aqui é duplo: adicionar Facebook como
-- segunda opção, e mostrar os dois no perfil público, pra quem está
-- escolhendo corretor conseguir conferir as redes sociais dele antes
-- de agendar (confiança).
alter table profiles add column if not exists facebook text;
