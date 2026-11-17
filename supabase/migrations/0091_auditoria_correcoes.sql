-- ============================================================
-- Rede Impulso — correções da auditoria geral de segurança e
-- integridade de dados (mesma classe de bug das migrações 0072/
-- 0073/0084/0085/0089/0090: RLS trava por LINHA, nunca por COLUNA,
-- então "dono da linha" sozinho deixa o dono forjar qualquer campo
-- daquela linha, não só os que a aplicação realmente edita).
-- ============================================================

-- ---------- 1. matriculas: pagamento e certificado forjáveis ----------
-- "matriculas: dono ve e cria as proprias" (migração 0013) é `for all`
-- com `using/with check (auth.uid() = profile_id)`, sem nenhuma trava
-- de coluna. Qualquer aluno podia (a) inserir a própria matrícula com
-- QUALQUER valor (não necessariamente o preço real do curso) e (b)
-- fazer UPDATE profiles SET status = 'concluido' direto, o que libera
-- o certificado em /cursos/[id]/certificado (checa só
-- `status !== "concluido"`) sem nunca ter pago nem cursado nada.
--
-- Fecha os dois buracos: ninguém mais escreve em matriculas direto —
-- matricular-se vira uma function que busca o preço real do curso no
-- servidor (cliente não controla mais `valor`), e mudar status vira
-- function exclusiva de admin (mesmo padrão de revisar_perfil/
-- revisar_documento, migração 0011).
revoke insert, update on matriculas from authenticated;

create function public.matricular_em_curso(p_curso_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preco numeric(10, 2);
  v_matricula_id uuid;
begin
  select preco into v_preco from cursos where id = p_curso_id and ativo;
  if v_preco is null then
    raise exception 'Curso não encontrado ou inativo';
  end if;

  insert into matriculas (curso_id, profile_id, valor)
  values (p_curso_id, auth.uid(), v_preco)
  on conflict (curso_id, profile_id) do nothing
  returning id into v_matricula_id;

  if v_matricula_id is null then
    select id into v_matricula_id from matriculas where curso_id = p_curso_id and profile_id = auth.uid();
  end if;

  return v_matricula_id;
end;
$$;

grant execute on function public.matricular_em_curso(uuid) to authenticated;

create function public.definir_status_matricula(p_matricula_id uuid, p_novo_status matricula_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update matriculas set status = p_novo_status where id = p_matricula_id;
end;
$$;

grant execute on function public.definir_status_matricula(uuid, matricula_status) to authenticated;

-- ---------- 2. leads: funil e valor de venda forjáveis ----------
-- "leads: corretor atualiza o funil dos proprios" (migração 0088) não
-- tinha trava de coluna: o corretor podia não só reportar o próprio
-- funil (status/valor_venda/visita_id — o comportamento desejado,
-- "marcar vendido + valor", já decidido como self-report) como também
-- mudar `organizacao_catalogo_id`/`corretor_id`, movendo um lead pra
-- outra organização ou "roubando" o lead de outro corretor. Grant
-- restrito às colunas que o funil de verdade usa (ver lead-card.tsx).
revoke update on leads from authenticated;
grant update (status, valor_venda, visita_id, updated_at)
  on leads to authenticated;

-- ---------- 3. profiles.telefone_verificado_em autosserviço ----------
-- O grant da migração 0086 incluiu telefone_verificado_em junto com
-- telefone, liberado pra `authenticated` igual qualquer campo comum —
-- qualquer um podia gravar telefone_verificado_em = now() direto,
-- pulando o código OTP de /api/telefone/verificar-codigo (a única via
-- legítima). Essa rota passa a usar a service role pra essa escrita
-- específica (código de verificação já confere a autorização sozinho,
-- não precisa de RLS); o grant comum perde essa coluna.
revoke update on profiles from authenticated;
grant update (nome, telefone, rede_social, foto_url, facebook, data_nascimento, role, termos_aceitos_em)
  on profiles to authenticated;

-- Efeito colateral do bug acima, também corrigido: trocar o telefone
-- por /editar-perfil nunca zerava telefone_verificado_em (nenhum
-- trigger fazia isso, apesar do comentário da 0086 dizer que "a
-- aplicação zera") — o carimbo de verificado ficava grudado num
-- número novo nunca verificado. Com telefone_verificado_em travado
-- pra authenticated, só um trigger consegue zerar isso de volta: reseta
-- sempre que telefone muda SEM telefone_verificado_em ter sido setado
-- na mesma escrita (é exatamente o que a function de verificação faz —
-- muda os dois juntos — então ela nunca é desfeita por este trigger).
create function public.limpar_verificacao_telefone()
returns trigger
language plpgsql
as $$
begin
  if new.telefone is distinct from old.telefone
     and new.telefone_verificado_em is not distinct from old.telefone_verificado_em then
    new.telefone_verificado_em := null;
  end if;
  return new;
end;
$$;

create trigger trg_limpar_verificacao_telefone
  before update on profiles
  for each row
  execute function public.limpar_verificacao_telefone();

-- ---------- 4. (removido) ----------
-- A auditoria apontou a tabela `negocios` como morta e forjável, mas
-- ela já tinha sido removida na migração 0058 (limpeza do marketplace
-- anterior ao pivô "agendamento direto") — o achado leu só a criação
-- original (0001) sem checar se uma migração posterior já tinha
-- derrubado a tabela. Nada a corrigir aqui.

-- ---------- 5. leads: organização excluída não pode apagar histórico ----------
-- `leads.organizacao_catalogo_id` tinha `on delete cascade` — excluir
-- uma organização do catálogo em /admin/catalogo (atrás de um
-- `confirm()` genérico, sem mencionar leads) apagava pra sempre todo o
-- histórico de vendas daquela organização. Vira `set null`: a
-- organização pode ser removida do catálogo, mas o lead (e o
-- valor_venda já fechado) continua existindo como registro histórico.
alter table leads drop constraint leads_organizacao_catalogo_id_fkey;
alter table leads
  add constraint leads_organizacao_catalogo_id_fkey
  foreign key (organizacao_catalogo_id) references organizacoes_catalogo (id) on delete set null;
alter table leads alter column organizacao_catalogo_id drop not null;

-- ---------- 6. verificação de maioridade sem fuso horário ----------
-- `current_date` no Postgres (que roda em UTC na Vercel/Supabase) já
-- vira o dia seguinte às 21h em Brasília — mesma classe de bug de fuso
-- já corrigida várias vezes nesta sessão (hojeISO/somarDias), mas essa
-- constraint e a validação equivalente em handle_new_user() ficaram de
-- fora. Ancora as duas em America/Sao_Paulo.
alter table profiles drop constraint profiles_maior_idade;
alter table profiles add constraint profiles_maior_idade
  check (
    data_nascimento is null
    or data_nascimento <= ((now() at time zone 'America/Sao_Paulo')::date - interval '18 years')
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  v_role user_role;
  v_role_texto text := nullif(trim(meta->>'role'), '');
  v_nome text;
  v_data_nascimento date;
begin
  if v_role_texto is not null
     and exists (
       select 1 from unnest(enum_range(null::user_role)) as r
       where r::text = v_role_texto
     )
  then
    v_role := v_role_texto::user_role;
  else
    v_role := 'comprador';
  end if;

  v_nome := coalesce(
    nullif(trim(meta->>'nome'), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    ''
  );

  begin
    v_data_nascimento := nullif(meta->>'data_nascimento', '')::date;
    if v_data_nascimento is not null
       and v_data_nascimento > ((now() at time zone 'America/Sao_Paulo')::date - interval '18 years')
    then
      v_data_nascimento := null;
    end if;
  exception when others then
    v_data_nascimento := null;
  end;

  insert into public.profiles (
    id, role, nome, telefone, email, rede_social, foto_url, termos_aceitos_em, data_nascimento
  )
  values (
    new.id,
    v_role,
    v_nome,
    nullif(trim(coalesce(meta->>'telefone', '')), ''),
    new.email,
    nullif(meta->>'rede_social', ''),
    nullif(coalesce(meta->>'avatar_url', meta->>'picture'), ''),
    now(),
    v_data_nascimento
  )
  on conflict (id) do nothing;

  if v_role = 'corretor' then
    insert into public.corretor_perfis (profile_id, creci, bairros_atuacao, cidades_atuacao, cpf)
    values (
      new.id,
      coalesce(meta->>'creci', ''),
      case
        when jsonb_exists(meta, 'bairros_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'bairros_atuacao'))
        else '{}'::text[]
      end,
      case
        when jsonb_exists(meta, 'cidades_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'cidades_atuacao'))
        else '{}'::text[]
      end,
      nullif(trim(coalesce(meta->>'cpf', '')), '')
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

-- ---------- 7. índices faltando em colunas filtradas o tempo todo ----------
create index if not exists corretor_perfis_organizacao_catalogo_id_idx
  on corretor_perfis (organizacao_catalogo_id);

create index if not exists solicitacoes_vinculo_solicitante_id_idx
  on solicitacoes_vinculo (solicitante_id);

-- ---------- 8. selo de verificado e nota invisíveis na busca ----------
-- O selo "✓ Verificado" (recém-adicionado) e as estrelas só apareciam
-- no perfil individual do corretor — na listagem de /buscar-
-- profissionais, onde o cliente realmente decide em QUAL corretor
-- clicar, nenhum dos dois sinais de confiança aparecia. A função de
-- busca por cidade precisa ser recriada (muda o `returns table`).
drop function if exists public.buscar_corretores_por_cidade(text);

create function public.buscar_corretores_por_cidade(termo text)
returns table (
  profile_id uuid,
  creci text,
  cidades_atuacao text[],
  nome text,
  foto_url text,
  estrelas numeric,
  verificado boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    cp.profile_id, cp.creci, cp.cidades_atuacao, p.nome, p.foto_url,
    cp.estrelas, (p.verification_status = 'aprovado')
  from corretor_perfis cp
  join profiles p on p.id = cp.profile_id
  where exists (
    select 1 from unnest(cp.cidades_atuacao) as c where c ilike '%' || termo || '%'
  )
  limit 12;
$$;

grant execute on function public.buscar_corretores_por_cidade(text) to anon, authenticated;
