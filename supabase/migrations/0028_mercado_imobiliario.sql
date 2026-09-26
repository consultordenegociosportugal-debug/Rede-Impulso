-- ============================================================
-- Rede Impulso — Inteligência de mercado (Brasil, Portugal, EUA)
--
-- Um job diário (src/app/api/mercado-imobiliario/atualizar) pesquisa os
-- três mercados que a Rede Impulso acompanha — preços/índices, juros e
-- financiamento, notícias/tendências, ranking de corretores/imobiliárias
-- e oportunidades de investimento — e grava um retrato do dia aqui. O
-- assistente (src/app/api/assistente) lê sempre a linha mais recente
-- via a ferramenta consultar_mercado_imobiliario.
--
-- Escrita não tem sessão de usuário (é um cron), então segue o mesmo
-- padrão de confirmar_assinatura (migração 0025): function security
-- definer chamada por um endpoint protegido por segredo (CRON_SECRET),
-- sem precisar de service role key.
-- ============================================================

create table mercado_imobiliario_snapshots (
  id uuid primary key default gen_random_uuid(),
  data_referencia date not null unique,
  resumo_executivo text not null,
  paises jsonb not null,
  oportunidades_comparativas jsonb not null,
  created_at timestamptz not null default now()
);

comment on table mercado_imobiliario_snapshots is 'Retrato diário comparativo do mercado imobiliário Brasil/Portugal/EUA. paises tem uma chave por país (brasil, portugal, eua), cada uma com preco_indices, juros_financiamento, noticias_tendencias, ranking_corretores e oportunidade_investimento — mesma estrutura de relatório da skill mercado-imobiliario. oportunidades_comparativas é a leitura cruzada final (onde está o melhor risco/retorno agora).';

create index on mercado_imobiliario_snapshots (data_referencia desc);

alter table mercado_imobiliario_snapshots enable row level security;

-- Só corretor e imobiliária (mais admin) enxergam inteligência de
-- mercado internacional — não é algo exposto na vitrine pública nem
-- pro cliente comum, por decisão de produto.
create policy "mercado_imobiliario_snapshots: corretor e imobiliaria leem"
  on mercado_imobiliario_snapshots for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('corretor', 'imobiliaria')
    )
    or public.is_admin()
  );

create function public.salvar_mercado_imobiliario_snapshot(
  p_data_referencia date,
  p_resumo_executivo text,
  p_paises jsonb,
  p_oportunidades_comparativas jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into mercado_imobiliario_snapshots
    (data_referencia, resumo_executivo, paises, oportunidades_comparativas)
  values
    (p_data_referencia, p_resumo_executivo, p_paises, p_oportunidades_comparativas)
  on conflict (data_referencia) do update
    set resumo_executivo = excluded.resumo_executivo,
        paises = excluded.paises,
        oportunidades_comparativas = excluded.oportunidades_comparativas;
end;
$$;

comment on function public.salvar_mercado_imobiliario_snapshot is 'Chamada pelo job diário em /api/mercado-imobiliario/atualizar (sem sessão de usuário) — o endpoint em si é protegido por CRON_SECRET antes de chegar aqui, mesmo tradeoff documentado em confirmar_pagamento_destaque (migração 0024).';

grant execute on function public.salvar_mercado_imobiliario_snapshot(date, text, jsonb, jsonb) to anon, authenticated;
