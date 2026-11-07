-- ============================================================
-- Rede Impulso — trava buscar_comprador_por_telefone_e164 para corretores
--
-- A function (migração 0070) já tinha a intenção documentada de só
-- servir à rota de agendamento, chamada pelo CORRETOR cadastrando um
-- cliente avulso — mas o `grant execute ... to authenticated` deixou
-- QUALQUER usuário logado (inclusive uma conta de comprador/cliente,
-- sem nenhuma relação de negócio) chamar o RPC direto (ex.: console do
-- navegador, sem passar pela rota Next.js), adivinhando/testando
-- números de telefone e recebendo de volta nome completo + e-mail de
-- quem tiver aquele telefone cadastrado. Sem rate limit, sem trilha de
-- auditoria — um vazamento de PII por enumeração de telefone.
--
-- A rota /api/visitas/agendar só chama isso quando corretor_id ===
-- auth.uid() (ver código), então restringir a function a corretores
-- cadastrados não quebra nenhum uso legítimo — só fecha a porta de
-- chamar o RPC por fora da rota.
-- ============================================================

create or replace function public.buscar_comprador_por_telefone_e164(p_telefone text)
returns table (id uuid, nome text, email text, telefone text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from corretor_perfis where profile_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select p.id, p.nome, p.email, p.telefone
  from profiles p
  where p.role = 'comprador' and p.telefone = p_telefone
  limit 1;
end;
$$;
