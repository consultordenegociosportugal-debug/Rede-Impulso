-- ============================================================
-- Rede Impulso — mensagens de cliente recebidas por WhatsApp
--
-- confirmacao_visita e lembrete_visita terminam avisando "qualquer
-- alteração, é só nos avisar por aqui mesmo" — mas até aqui o webhook
-- (src/app/api/webhooks/whatsapp/route.ts) só tratava resposta de
-- BOTÃO do lembrete (Confirmar presença/Preciso reagendar); uma
-- mensagem de TEXTO livre do cliente só ia pro console.log (efêmero)
-- e nunca chegava a lugar nenhum pro corretor ver. CONFIRMADO ao vivo:
-- usuário respondeu pedindo pra mudar o horário e nada aconteceu.
-- ============================================================

create table mensagens_cliente (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles (id) on delete cascade,
  visita_id uuid references visitas (id) on delete set null,
  nome_cliente text not null,
  telefone text not null,
  texto text not null,
  whatsapp_message_id text,
  recebida_em timestamptz not null default now(),
  lida_em timestamptz
);

-- Evita duplicar a mesma mensagem se a Meta reentregar o mesmo evento
-- de webhook (comportamento documentado: ela reenvia em caso de
-- qualquer soneca na confirmação do lado de cá).
create unique index mensagens_cliente_whatsapp_message_id_key
  on mensagens_cliente (whatsapp_message_id)
  where whatsapp_message_id is not null;

-- Mesmo padrão de clientes_notas (migração 0099): índice parcial só
-- nas não lidas, que é a única consulta que o painel faz de verdade.
create index mensagens_cliente_corretor_nao_lidas_idx
  on mensagens_cliente (corretor_id, recebida_em)
  where lida_em is null;

alter table mensagens_cliente enable row level security;

-- Só leitura/atualização (marcar como lida) pelo corretor dono — a
-- escrita de uma mensagem nova é sempre feita pelo webhook via service
-- role (não tem sessão de usuário nenhuma ali), por isso não existe
-- policy de insert pra authenticated.
create policy "mensagens_cliente: corretor ve e atualiza as suas"
  on mensagens_cliente for select
  to authenticated
  using (auth.uid() = corretor_id);

create policy "mensagens_cliente: corretor marca como lida"
  on mensagens_cliente for update
  to authenticated
  using (auth.uid() = corretor_id)
  with check (auth.uid() = corretor_id);
