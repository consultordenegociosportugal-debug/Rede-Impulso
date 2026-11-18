-- ============================================================
-- Rede Impulso — coordenadas da organização (geolocalização)
--
-- Pedido do dono do sistema: usar geolocalização pra facilitar a
-- localização entre corretor e cliente. Primeiro recorte: geocodificar
-- o endereço da organização (migração 0093) uma vez, ao salvar, e usar
-- essas coordenadas pra calcular a distância até o cliente no link
-- público de agendamento — sem precisar de chave de mapa paga (ver
-- src/lib/geocodificar.ts, usa o Nominatim do OpenStreetMap).
-- ============================================================

alter table organizacoes_catalogo add column latitude numeric(9, 6);
alter table organizacoes_catalogo add column longitude numeric(9, 6);

comment on column organizacoes_catalogo.latitude is 'Geocodificado a partir de `endereco` ao salvar (Nominatim/OpenStreetMap) — nulo se o endereço não foi reconhecido ou ainda não foi preenchido.';
comment on column organizacoes_catalogo.longitude is 'Ver comentário de `latitude`.';
