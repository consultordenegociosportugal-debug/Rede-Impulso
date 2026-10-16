-- ============================================================
-- Rede Impulso — Plano Profissional vira plano de EQUIPE
--
-- Levantamento no appbarber.com.br: lá o plano é vendido por tamanho
-- de equipe (1 / 2 a 5 / 6 a 15 / +15 profissionais), não por volume
-- de anúncio. Faz mais sentido pra nós também agora que o foco é
-- agendamento e gestão de equipes (ver painel-corretores e o convite
-- de equipe da migração 0047) — não quantidade de imóvel publicado.
--
-- Decisão: NÃO mexer no limite de imóveis (migração 0025) — ele
-- continua existindo exatamente como está, é uma trava independente e
-- já testada. Isto aqui adiciona uma SEGUNDA dimensão na mesma linha
-- de assinaturas_plano: quantos corretores a imobiliária pode ter
-- ativos na equipe. Os dois limites sobem juntos quando a imobiliária
-- assina um plano (mesma compra, dois efeitos).
-- ============================================================

alter table assinaturas_plano add column limite_equipe int;

comment on column assinaturas_plano.limite_equipe is 'Quantidade de corretores que esta assinatura libera na equipe da imobiliária (ver corretor_perfis.imobiliaria_id e convites_equipe). Null nas assinaturas antigas, criadas antes desta coluna existir.';

create function public.limite_equipe_profissional(p_profile_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select limite_equipe from assinaturas_plano
      where profile_id = p_profile_id and status = 'ativa' and limite_equipe is not null
      order by limite_equipe desc
      limit 1
    ),
    2
  );
$$;

comment on function public.limite_equipe_profissional is 'Quantos corretores uma imobiliária pode ter ativos na equipe. 2 de graça sem assinatura; o limite da assinatura ativa, se houver.';
