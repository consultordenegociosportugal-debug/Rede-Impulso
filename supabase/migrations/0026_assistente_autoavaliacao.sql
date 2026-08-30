-- ============================================================
-- Rede Impulso — Metacognição do assistente de IA
--
-- Cada resposta final do assistente (src/app/api/assistente) vem com um
-- marcador oculto de autoavaliacao (<!--AUTOAVALIACAO confianca="..."
-- faltou="..."-->), extraido no route.ts e removido antes de chegar ao
-- usuario. Aqui so guardamos o resultado pra dar visibilidade ao time de
-- onde a IA fica insegura ou sem dado suficiente — sem isso, respostas
-- fracas do assistente passam batido.
-- ============================================================

create table assistente_interacoes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles (id) on delete set null,
  pergunta text not null,
  resposta text not null,
  confianca text not null default 'media' check (confianca in ('alta', 'media', 'baixa')),
  faltou text,
  imoveis_encontrados int not null default 0,
  created_at timestamptz not null default now()
);

comment on table assistente_interacoes is 'Log de autoavaliacao do assistente de IA — confianca e faltou vem de um marcador que o proprio modelo gera ao final de cada resposta, pra revisao humana das respostas mais fracas.';

create index on assistente_interacoes (confianca, created_at desc);
create index on assistente_interacoes (profile_id);

alter table assistente_interacoes enable row level security;

create policy "assistente_interacoes: qualquer um insere a propria"
  on assistente_interacoes for insert
  to anon, authenticated
  with check (profile_id is null or profile_id = auth.uid());

create policy "assistente_interacoes: dono ve as proprias"
  on assistente_interacoes for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "assistente_interacoes: admin ve tudo"
  on assistente_interacoes for select
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_admin));
