-- ============================================================
-- Rede Impulso — resposta do cliente ao lembrete de visita
--
-- Feedback de corretor em teste: a confirmação deve ser feita pelo
-- cliente, e se ele disser que não vai dar, precisa de um caminho pra
-- reagendar. O lembrete de visita (lembrete_visita, template da Meta)
-- ganha botões de resposta rápida — este campo guarda o que o cliente
-- respondeu, lido pelo webhook do WhatsApp (src/app/api/webhooks/
-- whatsapp/route.ts).
-- ============================================================

create type visita_resposta_cliente as enum ('confirmou', 'pediu_reagendamento');

alter table visitas add column resposta_cliente visita_resposta_cliente;
alter table visitas add column resposta_recebida_em timestamptz;
alter table visitas add column lembrete_whatsapp_message_id text;

comment on column visitas.resposta_cliente is 'Resposta do cliente ao lembrete por WhatsApp (botão "Confirmar presença"/"Preciso reagendar"). Nulo = ainda não respondeu.';
comment on column visitas.resposta_recebida_em is 'Quando a resposta acima chegou pelo webhook.';
comment on column visitas.lembrete_whatsapp_message_id is 'Id (wamid) da mensagem de lembrete enviada — o webhook usa isto (context.id da resposta) pra achar de qual visita o cliente está falando, sem depender só do telefone.';

-- Nenhum grant precisa ser adicionado aqui de propósito: a migração 0075
-- já revogou UPDATE geral em `visitas` e só liberou (status,
-- google_event_id) pra `authenticated` — colunas novas não herdam
-- acesso nenhum. Só o webhook, via service role (ignora RLS e
-- privilégios de coluna), escreve essas duas colunas; nem o cliente
-- nem o corretor conseguem forjar a resposta direto no banco.
