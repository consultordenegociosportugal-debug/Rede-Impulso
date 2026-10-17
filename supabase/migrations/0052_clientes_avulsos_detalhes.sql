-- ============================================================
-- Rede Impulso — mais dados no cadastro de cliente avulso
--
-- O corretor pediu dois campos a mais no cadastro rápido (0051): cidade
-- de atendimento e o imóvel que o cliente tem interesse. Como o
-- marketplace de imóveis está pausado, "imóvel de interesse" aqui é
-- texto livre (ex.: "apê 2 quartos no bairro X") — não um vínculo com
-- um imóvel cadastrado de verdade.
-- ============================================================

alter table clientes_avulsos add column cidade text;
alter table clientes_avulsos add column imovel_interesse text;

comment on column clientes_avulsos.cidade is 'Cidade de atendimento do cliente, informada pelo corretor.';
comment on column clientes_avulsos.imovel_interesse is 'Descrição livre do imóvel de interesse do cliente — não é um vínculo com a tabela imoveis.';
