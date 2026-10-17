-- ============================================================
-- Rede Impulso — remove as tabelas do marketplace de imóveis e da
-- mobilidade (motorista + elétricos). Depende da 0057 já aplicada
-- (reescreve as funções/policies que seriam derrubadas em cascata
-- junto com `imoveis`/`visitas.imovel_id`/`corretor_perfis.imobiliaria_id`).
-- ============================================================

alter table visitas drop column imovel_id cascade;
alter table corretor_perfis drop column imobiliaria_id cascade;
alter table depoimentos drop column negocio_id cascade;

drop function if exists public.limite_equipe_profissional(uuid);

drop table if exists sugestoes_corretor cascade;
drop table if exists imovel_fotos cascade;
drop table if exists negocio_documentos cascade;
drop table if exists ofertas_pos_negocio cascade;
drop table if exists parceiros_servico cascade;
drop table if exists manifestacoes_interesse cascade;
drop table if exists favoritos cascade;
drop table if exists denuncias_imovel cascade;
drop table if exists destaque_pagamentos cascade;
drop table if exists assinaturas_plano cascade;
drop table if exists assistente_interacoes cascade;
drop table if exists mercado_imobiliario_snapshots cascade;
drop table if exists parceiro_destaque_pagamentos cascade;
drop table if exists radar_mercado_diario cascade;
drop table if exists denuncias_direitos_autorais cascade;
drop table if exists convites_equipe cascade;
drop table if exists negocios cascade;
drop table if exists imoveis cascade;
drop table if exists imobiliaria_perfis cascade;
drop table if exists construtora_perfis cascade;
drop table if exists cartorio_perfis cascade;

drop type if exists negocio_status cascade;
drop type if exists imovel_status cascade;
drop type if exists cartorio_status cascade;
drop type if exists convite_equipe_status cascade;

drop table if exists ev_veiculo_fotos cascade;
drop table if exists ev_veiculos cascade;
drop table if exists ev_eletropostos cascade;
drop table if exists ev_oficinas cascade;
drop table if exists ev_comentarios cascade;
drop table if exists ev_posts cascade;
drop table if exists ev_agente_sugestoes cascade;
drop table if exists ev_agentes cascade;
drop table if exists motorista_radar cascade;
drop table if exists motorista_perfis cascade;
drop table if exists pontos_apoio_avaliacoes cascade;
drop table if exists pontos_apoio cascade;

drop type if exists ev_cambio cascade;
