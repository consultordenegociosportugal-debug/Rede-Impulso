-- ============================================================
-- Rede Impulso — sincronização de anúncio com portais de Portugal
--
-- Fase 1 do roadmap do memo "Rede Impulso 2030" (hub de distribuição):
-- publicar 1x na Rede Impulso, sindicar via API oficial de portais
-- portugueses (Idealista, OLX Portugal, Imovirtual). Isto NÃO liga a
-- nenhuma API real ainda — o acesso de parceiro precisa ser pedido e
-- aprovado comercialmente primeiro (ver
-- developers.idealista.com/access-request, citado no memo). Este
-- schema só guarda a intenção do vendedor/corretor e o status da
-- sincronização, pronto pro dia em que a integração real existir —
-- ver src/lib/portais-externos.ts para a camada de código
-- correspondente (mesmo padrão "opcional" de mercadopago.ts e
-- google-calendar.ts).
-- ============================================================

create type portugal_sync_status as enum (
  'nao_sincronizado',
  'pendente',
  'publicado',
  'erro',
  'desativado'
);

alter table imoveis add column sincronizar_portugal boolean not null default false;
alter table imoveis add column portugal_status portugal_sync_status not null default 'nao_sincronizado';
alter table imoveis add column portugal_id_externo text;
alter table imoveis add column portugal_sincronizado_em timestamptz;
alter table imoveis add column portugal_erro text;

comment on column imoveis.sincronizar_portugal is 'Vendedor/corretor marcou intenção de também anunciar este imóvel em portais portugueses. Não dispara nada sozinho — só sinaliza demanda até a integração real existir.';
comment on column imoveis.portugal_status is 'Status da sincronização com o portal parceiro (ainda nenhum ativo). nao_sincronizado = nunca tentado; pendente = aguardando confirmação do portal; publicado = ativo lá; erro = falhou; desativado = removido de lá.';
comment on column imoveis.portugal_id_externo is 'Id do anúncio no portal parceiro (Idealista, OLX Portugal etc.), quando publicado.';
comment on column imoveis.portugal_erro is 'Última mensagem de erro da tentativa de sincronização, se houver.';

create index on imoveis (sincronizar_portugal) where sincronizar_portugal;
