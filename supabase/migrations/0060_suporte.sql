-- Rede Impulso — central de ajuda: quem usa o sistema manda um pedido de
-- suporte (logado ou não) e o admin acompanha/responde num painel próprio.

create table tickets_suporte (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles (id) on delete set null,
  nome text not null,
  email text not null,
  telefone text,
  assunto text not null,
  mensagem text not null,
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'fechado')),
  resposta text,
  respondido_em timestamptz,
  created_at timestamptz not null default now()
);

alter table tickets_suporte enable row level security;

-- Qualquer um pode abrir um chamado, logado ou não — é o formulário
-- público de /suporte. `profile_id` é sempre definido pelo servidor a
-- partir da sessão (nunca confiando no que o cliente mandar), então não
-- precisa de check nessa coluna aqui.
create policy "tickets_suporte: qualquer um abre um chamado"
  on tickets_suporte for insert
  to anon, authenticated
  with check (true);

-- Só o admin acompanha e responde — não existe, nesta primeira versão,
-- uma tela pro usuário ver o próprio histórico de chamados.
create policy "tickets_suporte: admin le e responde"
  on tickets_suporte for select
  to authenticated
  using (public.is_admin());

create policy "tickets_suporte: admin atualiza"
  on tickets_suporte for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index tickets_suporte_status_idx on tickets_suporte (status, created_at desc);
