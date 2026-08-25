-- ============================================================
-- Rede Impulso — atributos estruturados do imóvel
--
-- Levantamento direto da OLX (maior classificado do Brasil): tipo,
-- quartos, banheiros, vagas e área são os filtros que quem busca
-- imóvel realmente usa. Até aqui só tínhamos título livre — sem
-- esses campos, não dá pra filtrar por "apartamento 2 quartos" de
-- verdade, só por bairro.
-- ============================================================

create type imovel_tipo as enum ('apartamento', 'casa', 'kitnet', 'terreno', 'comercial', 'outro');

alter table imoveis add column tipo imovel_tipo not null default 'outro';
alter table imoveis add column quartos smallint;
alter table imoveis add column banheiros smallint;
alter table imoveis add column vagas smallint;
alter table imoveis add column area_m2 numeric(8, 1);

create index on imoveis (tipo);
