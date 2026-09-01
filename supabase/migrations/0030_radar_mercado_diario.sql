-- ============================================================
-- Rede Impulso — Radar do mercado (manchetes diárias públicas)
--
-- Job diário (src/app/api/radar-mercado/atualizar) pesquisa o mercado
-- imobiliário brasileiro do dia — usando busca na web de verdade — e
-- grava um punhado de manchetes curtas aqui. O ticker "Radar do
-- mercado" da landing page (src/components/ticker-mercado) lê a linha
-- mais recente. Público de propósito: ao contrário de
-- mercado_imobiliario_snapshots (migração 0028, que é a análise
-- completa BR/PT/EUA reservada a corretor/imobiliária), isto é
-- conteúdo leve para qualquer visitante ver na home.
--
-- Escrita não tem sessão de usuário (é um cron), então segue o mesmo
-- padrão de confirmar_pagamento_destaque (migração 0024): function
-- security definer chamada por um endpoint protegido por CRON_SECRET.
-- ============================================================

create table radar_mercado_diario (
  id uuid primary key default gen_random_uuid(),
  data_referencia date not null unique,
  manchetes jsonb not null,
  created_at timestamptz not null default now()
);

comment on table radar_mercado_diario is 'Manchetes curtas e públicas do mercado imobiliário brasileiro, uma linha por dia. manchetes é um array de {tag, texto} — mesma forma que o ticker já usa para o conteúdo estático de fallback.';

create index on radar_mercado_diario (data_referencia desc);

alter table radar_mercado_diario enable row level security;

create policy "radar_mercado_diario: leitura publica"
  on radar_mercado_diario for select
  to anon, authenticated
  using (true);

create function public.salvar_radar_mercado_diario(
  p_data_referencia date,
  p_manchetes jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into radar_mercado_diario (data_referencia, manchetes)
  values (p_data_referencia, p_manchetes)
  on conflict (data_referencia) do update
    set manchetes = excluded.manchetes;
end;
$$;

comment on function public.salvar_radar_mercado_diario is 'Chamada pelo job diário em /api/radar-mercado/atualizar (sem sessão de usuário) — o endpoint em si é protegido por CRON_SECRET antes de chegar aqui.';

grant execute on function public.salvar_radar_mercado_diario(date, jsonb) to anon, authenticated;
