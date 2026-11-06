-- ============================================================
-- Rede Impulso — trilha de auditoria de toda visita
--
-- Até aqui, "o que aconteceu com uma visita" só existia no status
-- atual dela — quem cancelou, quando foi confirmada, por que foi
-- cancelada (se foi o corretor que clicou, ou se foi porque a conta da
-- contraparte foi excluída) não ficava registrado em lugar nenhum.
--
-- Em vez de espalhar "insert into visitas_eventos" em cada rota que
-- mexe numa visita (agendar, reagendar, cancelar, confirmar, marcar
-- como realizada — e o que mais vier a existir), uma TRIGGER grava
-- automaticamente toda criação e toda troca de status, não importa
-- por qual caminho ela aconteceu (API route ou update direto do
-- navegador, como confirmar/realizada/não-compareceu em
-- visita-acoes.tsx). Isso garante que nada escapa do registro, mesmo
-- que alguém esqueça de logar manualmente num código novo.
--
-- visita_id e corretor_id viram null se a visita ou o perfil forem
-- excluídos depois (mesmo padrão "set null" das migrações 0068) — o
-- EVENTO em si nunca é apagado, só perde a referência.
-- ============================================================

create table visitas_eventos (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid references visitas (id) on delete set null,
  corretor_id uuid references profiles (id) on delete set null,
  status_anterior visita_status,
  status_novo visita_status not null,
  data_hora_visita timestamptz,
  motivo text,
  criado_em timestamptz not null default now()
);

comment on table visitas_eventos is 'Trilha de auditoria: toda visita criada ou que troca de status gera uma linha aqui, gravada por trigger — não por chamada manual. motivo só é preenchido quando quem mudou o status passou um motivo explícito (ver atualizar_status_visita_com_motivo); criação normal e as trocas feitas por update direto (confirmar, realizada, não-compareceu) ficam com motivo nulo, o que já é esperado.';

create index on visitas_eventos (visita_id);
create index on visitas_eventos (corretor_id);
create index visitas_eventos_criado_em_idx on visitas_eventos (criado_em desc);

alter table visitas_eventos enable row level security;

create policy "visitas_eventos: corretor ve os proprios"
  on visitas_eventos for select
  to authenticated
  using (auth.uid() = corretor_id);

create policy "visitas_eventos: admin ve tudo"
  on visitas_eventos for select
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- security definer: o corretor comum não tem (e não precisa ter)
-- policy de insert em visitas_eventos — é a trigger, não o usuário,
-- quem grava o evento, então ela roda com privilégio próprio.
create or replace function public.registrar_evento_visita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text;
begin
  -- Setting de sessão lido aqui (ver atualizar_status_visita_com_motivo)
  -- — é a única forma de uma function chamada ANTES do update passar um
  -- "motivo" pra dentro desta trigger sem acrescentar coluna nenhuma em
  -- `visitas` que precisasse ser limpa depois.
  v_motivo := current_setting('rede_impulso.motivo_evento', true);

  if TG_OP = 'INSERT' then
    insert into visitas_eventos (visita_id, corretor_id, status_anterior, status_novo, data_hora_visita, motivo)
    values (new.id, new.corretor_id, null, new.status, new.data_hora, v_motivo);
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    insert into visitas_eventos (visita_id, corretor_id, status_anterior, status_novo, data_hora_visita, motivo)
    values (new.id, new.corretor_id, old.status, new.status, new.data_hora, v_motivo);
  end if;

  return new;
end;
$$;

create trigger trg_registrar_evento_visita
  after insert or update on visitas
  for each row execute function public.registrar_evento_visita();

-- Único jeito de anexar um motivo a uma mudança de status: `set_config`
-- com `is_local = true` só vale dentro da MESMA transação, e cada
-- chamada separada do supabase-js é sua própria transação — por isso
-- "marcar o motivo" e "mudar o status" têm que estar na mesma function,
-- não em duas chamadas de API distintas. security invoker (padrão): o
-- update roda com o papel de quem chamou, então a RLS de `visitas`
-- continua valendo normalmente (um corretor só altera as próprias).
create or replace function public.atualizar_status_visita_com_motivo(
  p_visita_id uuid,
  p_status visita_status,
  p_motivo text default null
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_motivo is not null then
    perform set_config('rede_impulso.motivo_evento', p_motivo, true);
  end if;
  update visitas set status = p_status where id = p_visita_id;
end;
$$;

grant execute on function public.atualizar_status_visita_com_motivo(uuid, visita_status, text) to authenticated;
