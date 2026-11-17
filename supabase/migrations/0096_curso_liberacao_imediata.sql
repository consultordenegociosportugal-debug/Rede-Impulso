-- ============================================================
-- Rede Impulso — curso com liberação imediata (infoproduto)
--
-- Feedback de corretor em teste: "infoprodutos não validar" — curso
-- categoria infoproduto deveria liberar o acesso na hora, sem passar
-- pelo status pendente_pagamento/aprovação manual do admin (hoje todo
-- curso nasce 'pendente_pagamento' — matriculas-manager.tsx é quem
-- muda pra 'pago' manualmente, porque o Mercado Pago ainda não está
-- integrado). Cursos gratuitos ou vendidos por fora já não precisam
-- dessa espera.
-- ============================================================

alter table cursos add column liberacao_imediata boolean not null default false;

comment on column cursos.liberacao_imediata is 'true = matrícula já nasce "pago" (acesso liberado na hora), sem esperar confirmação manual do admin. Pensado pra infoprodutos/cursos gratuitos.';

create or replace function public.matricular_em_curso(p_curso_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preco numeric(10, 2);
  v_liberacao_imediata boolean;
  v_matricula_id uuid;
begin
  select preco, liberacao_imediata into v_preco, v_liberacao_imediata
  from cursos where id = p_curso_id and ativo;
  if v_preco is null then
    raise exception 'Curso não encontrado ou inativo';
  end if;

  insert into matriculas (curso_id, profile_id, valor, status)
  values (
    p_curso_id,
    auth.uid(),
    v_preco,
    case when v_liberacao_imediata then 'pago'::matricula_status else 'pendente_pagamento'::matricula_status end
  )
  on conflict (curso_id, profile_id) do nothing
  returning id into v_matricula_id;

  if v_matricula_id is null then
    select id into v_matricula_id from matriculas where curso_id = p_curso_id and profile_id = auth.uid();
  end if;

  return v_matricula_id;
end;
$$;
