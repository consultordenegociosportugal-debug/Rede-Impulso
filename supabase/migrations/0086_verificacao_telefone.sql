-- Verificação de telefone/WhatsApp por código (OTP) — mesmo espírito do
-- código de e-mail que o Supabase Auth já manda, mas pro telefone de
-- contato, que hoje só é validado por formato (regex), nunca que o
-- número realmente existe e pertence a quem cadastrou.
--
-- telefone_verificado_em fica null até o código ser confirmado; a
-- aplicação zera de volta pra null sempre que o telefone muda, forçando
-- reverificação.
alter table profiles add column telefone_verificado_em timestamptz;

-- A 0072 travou UPDATE em profiles por coluna — sem incluir a nova
-- coluna aqui, /api/telefone/verificar-codigo bateria no mesmo
-- "permission denied for table profiles" já visto em corretor_perfis.
grant update (nome, telefone, rede_social, foto_url, facebook, data_nascimento, role, termos_aceitos_em, telefone_verificado_em)
  on profiles to authenticated;

-- Um código pendente por usuário (upsert por profile_id sempre que um
-- novo código é pedido — não precisa de histórico de códigos antigos).
create table telefone_codigos (
  profile_id uuid primary key references profiles (id) on delete cascade,
  telefone text not null,
  codigo text not null,
  canal text not null check (canal in ('whatsapp', 'sms')),
  tentativas int not null default 0,
  expira_em timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table telefone_codigos is 'Código OTP pendente de confirmação pro telefone de contato — um por usuário, sobrescrito a cada reenvio.';

alter table telefone_codigos enable row level security;

create policy "telefone_codigos: dono gerencia o proprio"
  on telefone_codigos for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
