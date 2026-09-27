-- ============================================================
-- Rede Impulso Motorista — Mapa de apoio (fase 3)
--
-- Tudo o que o motorista de aplicativo procura no meio do turno, além
-- de recarga: GNV, banheiro, lugar para descansar, comer, lavar o carro,
-- borracharia. Os eletropostos continuam em ev_eletropostos (0032) — a
-- página /motorista/apoio junta as duas fontes no mesmo mapa.
--
-- Alimentado pela comunidade (qualquer conta cadastra) e avaliado pelos
-- próprios motoristas (nota 1–5, uma por pessoa por ponto).
--
-- Ao contrário de ev_eletropostos, latitude/longitude são obrigatórias:
-- o mapa de apoio é sobre "o que está perto de mim agora", e um ponto sem
-- coordenada não aparece nele.
-- ============================================================

create type ponto_apoio_tipo as enum (
  'gnv', 'banheiro', 'descanso', 'alimentacao', 'lavagem', 'borracharia', 'outro'
);

create table pontos_apoio (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid references profiles (id) on delete set null,
  tipo ponto_apoio_tipo not null,
  nome text not null,
  endereco text not null,
  cidade text not null,
  estado text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  aberto_24h boolean not null default false,
  gratuito boolean not null default false,
  horario text,
  observacoes text,
  ativo boolean not null default true,
  origem text not null default 'comunidade' check (origem in ('comunidade', 'agente')),
  -- Preenchidos pelo agente de GNV (dados da ANP) — ver o fim do arquivo.
  preco numeric(6, 2),
  preco_unidade text,
  preco_atualizado_em date,
  bandeira text,
  -- true quando a geocodificação só achou o CEP/cidade, não a rua.
  localizacao_aproximada boolean not null default false,
  fonte_externa_id text unique,
  created_at timestamptz not null default now()
);

comment on table pontos_apoio is 'Pontos de apoio para motoristas (GNV, banheiro, descanso, alimentação, lavagem, borracharia). Cadastro aberto; eletropostos ficam em ev_eletropostos.';

create index on pontos_apoio (tipo);
create index on pontos_apoio (cidade);
create index on pontos_apoio (estado);

create table pontos_apoio_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  ponto_id uuid not null references pontos_apoio (id) on delete cascade,
  autor_id uuid not null references profiles (id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (char_length(comentario) <= 500),
  created_at timestamptz not null default now(),
  unique (ponto_id, autor_id)
);

create index on pontos_apoio_avaliacoes (ponto_id);

-- Média e total de avaliações por ponto, para listar sem N+1.
-- security_invoker: respeita a RLS das tabelas de base.
create view pontos_apoio_resumo with (security_invoker = true) as
  select
    p.*,
    round(avg(a.nota)::numeric, 1) as nota_media,
    count(a.id)::int as total_avaliacoes
  from pontos_apoio p
  left join pontos_apoio_avaliacoes a on a.ponto_id = p.id
  group by p.id;

grant select on pontos_apoio_resumo to anon, authenticated;

-- ============================================================
-- RLS — leitura pública; escrita só do dono da linha.
-- ============================================================

alter table pontos_apoio enable row level security;

create policy "pontos_apoio: diretorio publico"
  on pontos_apoio for select
  to anon, authenticated
  using (true);

create policy "pontos_apoio: autenticado cadastra"
  on pontos_apoio for insert
  to authenticated
  with check (auth.uid() = criado_por);

create policy "pontos_apoio: quem cadastrou edita"
  on pontos_apoio for update
  to authenticated
  using (auth.uid() = criado_por)
  with check (auth.uid() = criado_por);

create policy "pontos_apoio: quem cadastrou remove"
  on pontos_apoio for delete
  to authenticated
  using (auth.uid() = criado_por);

alter table pontos_apoio_avaliacoes enable row level security;

create policy "pontos_apoio_avaliacoes: publicas"
  on pontos_apoio_avaliacoes for select
  to anon, authenticated
  using (true);

create policy "pontos_apoio_avaliacoes: autor avalia"
  on pontos_apoio_avaliacoes for insert
  to authenticated
  with check (auth.uid() = autor_id);

create policy "pontos_apoio_avaliacoes: autor edita a propria"
  on pontos_apoio_avaliacoes for update
  to authenticated
  using (auth.uid() = autor_id)
  with check (auth.uid() = autor_id);

create policy "pontos_apoio_avaliacoes: autor remove a propria"
  on pontos_apoio_avaliacoes for delete
  to authenticated
  using (auth.uid() = autor_id);

-- ============================================================
-- Agente de GNV (dados abertos da ANP)
--
-- Toda semana a ANP publica o Levantamento de Preços por posto, incluindo
-- GNV (~450 postos). O agente "gnv" (src/lib/agentes-eletricos/gnv.ts)
-- geocodifica os postos novos e propõe cada um como ponto de apoio; os
-- preços dos que já estão no mapa ele atualiza direto (é dado oficial,
-- não conteúdo novo). fonte_externa_id = 'anp:<CNPJ>' evita duplicar.
-- ============================================================

alter type ev_sugestao_acao add value if not exists 'criar_ponto_apoio';

insert into ev_agentes (id, nome, descricao) values
  ('gnv', 'Postos de GNV (ANP)', 'Traz para o mapa de apoio os postos com GNV do levantamento semanal de preços da ANP e mantém o preço do m³ atualizado.')
on conflict (id) do nothing;

-- Uma sugestão pendente por posto da ANP.
create unique index ev_agente_sugestoes_ponto_pendente_unico
  on ev_agente_sugestoes ((payload->>'fonte_externa_id'))
  where status = 'pendente' and payload ? 'fonte_externa_id';

create or replace function public.aplicar_sugestao_agente(p_sugestao_id uuid)
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

  elsif s.acao = 'criar_ponto_apoio' then
    insert into pontos_apoio (
      tipo, nome, endereco, cidade, estado, latitude, longitude,
      localizacao_aproximada, preco, preco_unidade, preco_atualizado_em,
      bandeira, observacoes, origem, fonte_externa_id
    ) values (
      (p->>'tipo')::ponto_apoio_tipo, p->>'nome', p->>'endereco', p->>'cidade', p->>'estado',
      (p->>'latitude')::numeric, (p->>'longitude')::numeric,
      coalesce((p->>'localizacao_aproximada')::boolean, false),
      (p->>'preco')::numeric, p->>'preco_unidade', (p->>'preco_atualizado_em')::date,
      p->>'bandeira', p->>'observacoes', 'agente', p->>'fonte_externa_id'
    )
    on conflict (fonte_externa_id) do nothing;

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

-- Aprovar em lote: para fontes oficiais com centenas de itens (GNV da ANP),
-- revisar um por um não faz sentido. Continua exigindo admin.
create function public.aprovar_sugestoes_do_agente(p_agente_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  s_id uuid;
  total integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem aprovar sugestões';
  end if;

  for s_id in
    select id from ev_agente_sugestoes
    where agente_id = p_agente_id and status = 'pendente'
    order by created_at
  loop
    begin
      perform public.aplicar_sugestao_agente(s_id);
      total := total + 1;
    exception when others then
      update ev_agente_sugestoes set status = 'erro', erro = sqlerrm where id = s_id;
    end;
  end loop;

  return total;
end;
$$;

revoke execute on function public.aprovar_sugestoes_do_agente(text) from public, anon;
grant execute on function public.aprovar_sugestoes_do_agente(text) to authenticated;
