-- ============================================================
-- Rede Impulso — modalidade da visita (presencial ou vídeo)
--
-- Feedback de corretor em teste: quando a visita é marcada com bastante
-- antecedência, o corretor quer poder oferecer uma alternativa por
-- vídeo em vez de só presencial. v1 não integra nenhuma plataforma de
-- vídeo de verdade (Meet/Zoom) — só marca a intenção; o corretor manda
-- o link da chamada por fora (WhatsApp), igual já faz hoje pra combinar
-- qualquer outro detalhe com o cliente.
-- ============================================================

create type visita_modalidade as enum ('presencial', 'video');

alter table visitas add column modalidade visita_modalidade not null default 'presencial';

comment on column visitas.modalidade is 'Presencial ou por vídeo — oferecido no agendamento quando a visita é marcada para mais de 1 dia à frente. Sem integração de videochamada própria; o link é combinado por fora.';
