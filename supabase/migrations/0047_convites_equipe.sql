-- ============================================================
-- Rede Impulso — convite de equipe (imobiliária → corretor)
--
-- Levantamento no painel "dono" do AppBarber (sistema.appbarber.com.br):
-- lá quem monta a equipe é o próprio dono, direto no painel. Aqui não dá
-- pra copiar isso ao pé da letra — o corretor já tem conta e login
-- próprios (migração 0001), e a policy de update de corretor_perfis
-- (migração 0002) só deixa a imobiliária ativar/desativar quem JÁ está
-- vinculado, de propósito: o vínculo em si (gravar imobiliaria_id pela
-- primeira vez) só pode nascer do auth.uid() = profile_id do próprio
-- corretor, pra uma imobiliária não conseguir "puxar" um corretor pra
-- equipe sem ele saber.
--
-- Por isso o convite: a imobiliária registra a intenção aqui, manda um
-- e-mail com um link, e quem aceita — gravando o próprio imobiliaria_id
-- — é o corretor, de dentro da própria conta.
-- ============================================================

create type convite_equipe_status as enum ('pendente', 'aceito', 'recusado', 'cancelado');

create table convites_equipe (
  id uuid primary key default gen_random_uuid(),
  imobiliaria_id uuid not null references profiles (id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid(),
  status convite_equipe_status not null default 'pendente',
  created_at timestamptz not null default now(),
  respondido_em timestamptz
);

comment on table convites_equipe is 'Convite da imobiliária para um corretor entrar na equipe. O corretor aceita de dentro da própria conta (grava o imobiliaria_id em corretor_perfis) — a imobiliária nunca grava esse vínculo diretamente.';
comment on column convites_equipe.token is 'Usado no link do e-mail (/convite-equipe/[token]) — dá pra ver o convite sem login, só responder exige estar autenticado.';

create unique index on convites_equipe (token);
create index on convites_equipe (imobiliaria_id);

-- Só um convite pendente por e-mail por imobiliária — reenviar não deve
-- duplicar linha, só o botão de reenvio (próxima etapa) vai atualizar
-- created_at da linha existente.
create unique index convites_equipe_pendente_unico
  on convites_equipe (imobiliaria_id, lower(email))
  where status = 'pendente';

alter table convites_equipe enable row level security;

create policy "convites_equipe: imobiliaria gerencia os proprios"
  on convites_equipe for all
  to authenticated
  using (auth.uid() = imobiliaria_id)
  with check (auth.uid() = imobiliaria_id);

comment on policy "convites_equipe: imobiliaria gerencia os proprios" on convites_equipe is 'A leitura/resposta do lado do corretor convidado passa pelas rotas /api/equipe/* com a service role (precisa achar o convite pelo token antes de ter qualquer vinculo), nao por RLS direto.';
