-- ============================================================
-- Rede Impulso Elétricos — agentes autônomos
--
-- Quatro agentes (jobs diários em /api/agentes-eletricos/executar,
-- disparados pelo Vercel Cron) que pesquisam na web e propõem
-- mudanças no braço de elétricos (migração 0032):
--   curadoria    — revisa anúncios de ev_veiculos (preço vs. mercado, sinais de golpe)
--   eletropostos — descobre eletropostos novos e marca os que fecharam
--   atendimento  — rascunha respostas para posts da comunidade sem resposta
--   oficinas     — encontra oficinas especializadas e prepara o contato de parceria
--
-- Modo de operação por agente (ev_agentes.modo):
--   'aprovacao' — tudo cai em ev_agente_sugestoes como 'pendente' e um
--                 admin aprova/rejeita em /admin/agentes (padrão).
--   'autonomo'  — o próprio job aplica a sugestão na hora (mesma
--                 function, chamada com a service role).
-- Trocar de modo é só um update nessa tabela — o código é o mesmo.
--
-- Escrita dos agentes: diferente do radar do mercado (0030), aqui o
-- job usa a SERVICE ROLE (SUPABASE_SERVICE_ROLE_KEY, só no servidor),
-- não uma function liberada para anon. Motivo: no modo autônomo o
-- agente escreve direto nos diretórios públicos, e uma function aberta
-- para anon deixaria qualquer um com a chave pública fazer o mesmo.
-- ============================================================

-- ---------- Tipos ----------

create type ev_agente_modo as enum ('aprovacao', 'autonomo');
create type ev_sugestao_acao as enum (
  'criar_eletroposto',
  'atualizar_eletroposto',
  'criar_oficina',
  'responder_post',
  'avaliar_veiculo'
);
create type ev_sugestao_status as enum ('pendente', 'aplicada', 'rejeitada', 'erro');
create type ev_curadoria_selo as enum ('preco_ok', 'preco_acima', 'preco_abaixo', 'suspeito');

-- ---------- ev_agentes (configuração) ----------

create table ev_agentes (
  id text primary key,
  nome text not null,
  descricao text not null,
  modo ev_agente_modo not null default 'aprovacao',
  ativo boolean not null default true,
  ultima_execucao timestamptz,
  ultimo_resultado text
);

comment on table ev_agentes is 'Um registro por agente autônomo do braço de elétricos. modo decide se as sugestões esperam aprovação de um admin ou são aplicadas direto.';

insert into ev_agentes (id, nome, descricao) values
  ('curadoria', 'Curadoria do marketplace', 'Revisa anúncios publicados: compara o preço com o mercado (FIPE e anúncios parecidos) e sinaliza sinais de golpe.'),
  ('eletropostos', 'Mapa de eletropostos', 'Pesquisa eletropostos públicos no Brasil que ainda não estão no diretório e marca como inativos os que fecharam.'),
  ('atendimento', 'Atendimento da comunidade', 'Rascunha respostas para dúvidas da comunidade que ainda não tiveram resposta.'),
  ('oficinas', 'Prospecção de oficinas', 'Encontra oficinas especializadas em elétricos e prepara a mensagem de convite para parceria.');

-- ---------- ev_agente_sugestoes (fila de aprovação) ----------

create table ev_agente_sugestoes (
  id uuid primary key default gen_random_uuid(),
  agente_id text not null references ev_agentes (id) on delete cascade,
  acao ev_sugestao_acao not null,
  -- Linha afetada, quando a ação mexe em algo que já existe
  -- (eletroposto a atualizar, post a responder, veículo avaliado).
  alvo_id uuid,
  -- Dados da ação — o formato depende de `acao`, ver aplicar_sugestao_agente.
  payload jsonb not null,
  resumo text not null,
  justificativa text,
  fontes jsonb not null default '[]',
  status ev_sugestao_status not null default 'pendente',
  erro text,
  revisado_por uuid references profiles (id) on delete set null,
  revisado_em timestamptz,
  created_at timestamptz not null default now()
);

comment on table ev_agente_sugestoes is 'Tudo o que um agente propõe fazer. Em modo aprovação fica pendente até um admin decidir; em modo autônomo o job aplica logo em seguida.';

create index on ev_agente_sugestoes (status, created_at);
create index on ev_agente_sugestoes (agente_id);
-- Evita o agente repropor a mesma coisa enquanto ela ainda está pendente.
create unique index ev_agente_sugestoes_pendente_unica
  on ev_agente_sugestoes (acao, alvo_id)
  where status = 'pendente' and alvo_id is not null;

-- ---------- Colunas novas nos diretórios ----------

-- Origem do cadastro: comunidade (formulário) ou agente (pesquisa).
alter table ev_eletropostos
  add column origem text not null default 'comunidade' check (origem in ('comunidade', 'agente')),
  add column fontes jsonb not null default '[]',
  add column verificado_em timestamptz;

alter table ev_oficinas
  add column origem text not null default 'comunidade' check (origem in ('comunidade', 'agente')),
  add column fontes jsonb not null default '[]';

-- Resposta do agente de atendimento: sem autor humano. autor_id passa a
-- ser opcional, mas todo comentário continua tendo exatamente um autor.
alter table ev_comentarios
  alter column autor_id drop not null,
  add column autor_agente text references ev_agentes (id) on delete set null,
  add constraint ev_comentarios_um_autor check ((autor_id is null) <> (autor_agente is null));

-- Selo da curadoria no anúncio.
alter table ev_veiculos
  add column curadoria_selo ev_curadoria_selo,
  add column curadoria_nota text,
  add column curadoria_em timestamptz;

-- ============================================================
-- RLS
-- ============================================================

alter table ev_agentes enable row level security;

create policy "ev_agentes: admin le"
  on ev_agentes for select
  to authenticated
  using (public.is_admin());

create policy "ev_agentes: admin muda modo"
  on ev_agentes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table ev_agente_sugestoes enable row level security;

create policy "ev_agente_sugestoes: admin le"
  on ev_agente_sugestoes for select
  to authenticated
  using (public.is_admin());

-- Sem policy de insert/update: agentes escrevem com a service role
-- (que ignora RLS) e admins só mudam status pelas functions abaixo.

-- ============================================================
-- Aplicar / rejeitar
-- ============================================================

create function public.aplicar_sugestao_agente(p_sugestao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s ev_agente_sugestoes;
  p jsonb;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Apenas administradores podem aplicar sugestões';
  end if;

  select * into s from ev_agente_sugestoes where id = p_sugestao_id for update;
  if not found then
    raise exception 'Sugestão não encontrada';
  end if;
  if s.status <> 'pendente' then
    raise exception 'Sugestão já foi revisada (%)', s.status;
  end if;

  p := s.payload;

  if s.acao = 'criar_eletroposto' then
    insert into ev_eletropostos (
      nome, endereco, cidade, estado, latitude, longitude, conectores,
      potencia_kw, preco_kwh, operadora, observacoes, origem, fontes, verificado_em
    ) values (
      p->>'nome', p->>'endereco', p->>'cidade', p->>'estado',
      (p->>'latitude')::numeric, (p->>'longitude')::numeric,
      coalesce(array(select jsonb_array_elements_text(p->'conectores'))::ev_conector[], '{}'),
      (p->>'potencia_kw')::numeric, (p->>'preco_kwh')::numeric,
      p->>'operadora', p->>'observacoes', 'agente', s.fontes, now()
    );

  elsif s.acao = 'atualizar_eletroposto' then
    update ev_eletropostos
      set status = coalesce((p->>'status')::ev_eletroposto_status, status),
          observacoes = coalesce(p->>'observacoes', observacoes),
          verificado_em = now()
      where id = s.alvo_id;

  elsif s.acao = 'criar_oficina' then
    insert into ev_oficinas (
      nome, especialidades, atende_marcas, cidade, estado, endereco,
      telefone, descricao, origem, fontes
    ) values (
      p->>'nome',
      coalesce(array(select jsonb_array_elements_text(p->'especialidades')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p->'atende_marcas')), '{}'),
      p->>'cidade', p->>'estado', p->>'endereco', p->>'telefone',
      p->>'descricao', 'agente', s.fontes
    );

  elsif s.acao = 'responder_post' then
    insert into ev_comentarios (post_id, autor_agente, texto)
    values (s.alvo_id, s.agente_id, p->>'texto');

  elsif s.acao = 'avaliar_veiculo' then
    update ev_veiculos
      set curadoria_selo = (p->>'selo')::ev_curadoria_selo,
          curadoria_nota = p->>'nota',
          curadoria_em = now()
      where id = s.alvo_id;
  end if;

  update ev_agente_sugestoes
    set status = 'aplicada',
        revisado_por = auth.uid(),
        revisado_em = now()
    where id = p_sugestao_id;
end;
$$;

comment on function public.aplicar_sugestao_agente is 'Executa a ação de uma sugestão pendente. Chamada por um admin em /admin/agentes ou, no modo autônomo, pelo próprio job com a service role.';

create function public.rejeitar_sugestao_agente(p_sugestao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem rejeitar sugestões';
  end if;

  update ev_agente_sugestoes
    set status = 'rejeitada',
        revisado_por = auth.uid(),
        revisado_em = now()
    where id = p_sugestao_id and status = 'pendente';
end;
$$;

revoke execute on function public.aplicar_sugestao_agente(uuid) from public, anon;
revoke execute on function public.rejeitar_sugestao_agente(uuid) from public, anon;
grant execute on function public.aplicar_sugestao_agente(uuid) to authenticated, service_role;
grant execute on function public.rejeitar_sugestao_agente(uuid) to authenticated;
