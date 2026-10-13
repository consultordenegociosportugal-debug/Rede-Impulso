-- ============================================================
-- Rede Impulso — aviso por e-mail antes de cada renovação da assinatura
--
-- O Mercado Pago não avisa o profissional antes de cobrar a mensalidade
-- do Plano Profissional — e a Rede Impulso também não avisava. Esses
-- dois campos guardam a data da próxima cobrança (estimada: a API do
-- preapproval do Mercado Pago nem sempre devolve isso de forma
-- confiável em todas as integrações, então tratamos como mensal a
-- partir da ativação — ver comentário no job /api/assinatura/avisar-renovacao)
-- e quando o lembrete já foi mandado, pra não mandar duas vezes pela
-- mesma cobrança.
-- ============================================================

alter table assinaturas_plano add column proxima_cobranca date;
alter table assinaturas_plano add column lembrete_enviado_em timestamptz;

comment on column assinaturas_plano.proxima_cobranca is 'Data estimada da proxima cobranca mensal. Setada para hoje + 1 mes sempre que a assinatura entra em status ativa; o cron de aviso rola essa data pra frente a cada ciclo que passa (ver /api/assinatura/avisar-renovacao), ja que o Mercado Pago nao confirma cada cobranca recorrente individualmente por aqui.';
comment on column assinaturas_plano.lembrete_enviado_em is 'Quando o e-mail de aviso de renovacao foi enviado pela ultima vez — evita reenvio pro mesmo ciclo.';

create or replace function public.confirmar_assinatura(p_assinatura_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update assinaturas_plano
    set status = p_status,
        updated_at = now(),
        proxima_cobranca = case when p_status = 'ativa' then current_date + interval '1 month' else proxima_cobranca end,
        lembrete_enviado_em = case when p_status = 'ativa' then null else lembrete_enviado_em end
    where id = p_assinatura_id;
end;
$$;

comment on function public.confirmar_assinatura is 'Chamada pelo webhook de assinatura do Mercado Pago (sem sessao de usuario) para atualizar o status da assinatura. Ao ativar, estima a proxima cobranca em +1 mes.';
