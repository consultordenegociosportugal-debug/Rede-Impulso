-- ============================================================
-- Rede Impulso — segunda leva de campos "estilo OLX" no imóvel
--
-- A primeira leva (0014/0015) trouxe tipo/quartos/banheiros/vagas/área
-- e a lista de comodidades. Comparando com um anúncio real de imóvel
-- na OLX, ainda faltavam os dois valores que todo comprador de
-- apartamento quer ver antes de clicar (condomínio e IPTU), o CEP
-- (a OLX mostra CEP na localização, não o endereço completo — por
-- privacidade do vendedor, que a gente já respeitava com bairro/cidade
-- + mapa), a categoria "Cobertura" (tipo de imóvel muito comum lá) e a
-- separação entre comodidades do imóvel e comodidades do condomínio —
-- a OLX trata como duas listas distintas porque são coisas diferentes
-- (academia dentro do apê vs. academia do prédio).
-- ============================================================

alter type imovel_tipo add value 'cobertura';

alter table imoveis add column cep text;
alter table imoveis add column condominio numeric(10, 2);
alter table imoveis add column iptu numeric(10, 2);
alter table imoveis add column comodidades_condominio text[] not null default '{}';
