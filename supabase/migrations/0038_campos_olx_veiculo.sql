-- ============================================================
-- Rede Impulso Elétricos — campos "estilo OLX" no anúncio de veículo
--
-- Mesmo levantamento da 0037, agora no lado de ev_veiculos: um anúncio
-- de carro na OLX sempre traz cor, câmbio, se é único dono e se aceita
-- troca — nenhum desses quatro existia aqui. Autonomia (km por carga)
-- não existe na OLX (lá é tudo carro a combustão), mas é o dado que
-- mais importa pra quem compra elétrico — o equivalente a "potência do
-- motor" nos anúncios de carro comum.
-- ============================================================

create type ev_cambio as enum ('automatico', 'manual', 'cvt', 'direto');

alter table ev_veiculos add column cor text;
alter table ev_veiculos add column cambio ev_cambio;
alter table ev_veiculos add column autonomia_km integer;
alter table ev_veiculos add column unico_dono boolean not null default false;
alter table ev_veiculos add column aceita_troca boolean not null default false;
