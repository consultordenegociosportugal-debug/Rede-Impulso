-- ============================================================
-- Rede Impulso — evita duplicar identidade quando o "cliente avulso"
-- já tem conta
--
-- Hoje, quando o corretor cadastra um cliente de balcão (nome +
-- telefone) que, por acaso, já é um comprador cadastrado na Rede
-- Impulso, nasce um registro NOVO em clientes_avulsos, sem ligação
-- nenhuma com a conta real — a visita não aparece em
-- "Meus agendamentos" daquela pessoa, e a identidade dela fica
-- duplicada entre corretores.
--
-- Esta function dá à rota de agendamento (POST /api/visitas/agendar)
-- um jeito de perguntar "esse telefone já é de um comprador?" sem dar
-- ao corretor acesso de leitura geral a perfis de outras pessoas — só
-- devolve id/nome/email/telefone pra uma correspondência EXATA do
-- telefone já normalizado (E.164), nunca uma busca/listagem.
-- security definer: a RLS de profiles não libera essa leitura pra um
-- corretor sem negócio em comum com o comprador ainda — é exatamente
-- essa leitura pontual que esta function existe pra abrir, sem
-- alargar a policy geral.
-- ============================================================

create or replace function public.buscar_comprador_por_telefone_e164(p_telefone text)
returns table (id uuid, nome text, email text, telefone text)
language sql
security definer
set search_path = public
stable
as $$
  select id, nome, email, telefone
  from profiles
  where role = 'comprador' and telefone = p_telefone
  limit 1;
$$;

grant execute on function public.buscar_comprador_por_telefone_e164(text) to authenticated;
