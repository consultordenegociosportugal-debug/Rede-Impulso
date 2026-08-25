-- ============================================================
-- Rede Impulso — matching de corretores e vínculo escolhido pelo
-- vendedor, mais diretório inicial de parceiros pós-negócio.
--
-- Até aqui `sugestoes_corretor` só tinha policies de leitura — nada
-- preenchia a tabela (o matching automático ficou como próxima
-- etapa no relatório). Esta migração faz a versão mais simples desse
-- matching: ao publicar o imóvel, o próprio cliente (vendedor) chama
-- esta function via RPC, que casa por bairro de atuação do corretor.
-- Fica security definer porque o insert em sugestoes_corretor é
-- reservado a backend/service_role (RLS não dá insert a
-- authenticated) — a function faz esse papel de forma controlada,
-- só agindo quando quem chama é o dono do imóvel.
-- ============================================================

create function public.gerar_sugestoes_corretor(p_imovel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bairro text;
begin
  select bairro into v_bairro
  from imoveis
  where id = p_imovel_id and vendedor_id = auth.uid();

  if v_bairro is null then
    return;
  end if;

  insert into sugestoes_corretor (imovel_id, corretor_id, score, notificado_em)
  select p_imovel_id, cp.profile_id, (cp.estrelas * 20) + least(cp.total_negocios, 50), now()
  from corretor_perfis cp
  where cp.ativo and v_bairro = any (cp.bairros_atuacao)
  on conflict (imovel_id, corretor_id) do nothing;
end;
$$;

grant execute on function public.gerar_sugestoes_corretor(uuid) to authenticated;

-- Quem abre um negócio hoje é só comprador/corretor/imobiliária
-- (migração 0001/0002). Falta o caso do vendedor escolher, na tela de
-- sugestão, um dos corretores sugeridos para o próprio imóvel —
-- reaproveita o helper is_imovel_vendedor já usado para quebrar a
-- recursão de RLS (migração 0004).
create policy "negocios: vendedor vincula corretor sugerido"
  on negocios for insert
  to authenticated
  with check (public.is_imovel_vendedor(imovel_id));

-- Diretório inicial de parceiros pós-negócio (tela de oferta
-- pós-negócio). Sem perfil de "parceiro" entre os 5 perfis do
-- produto, cadastro continua manual/backend — isto só garante que a
-- tela tenha conteúdo real na primeira carga.
insert into parceiros_servico (categoria, nome, ativo)
select v.categoria, v.nome, true
from (
  values
    ('comprador', 'Pintor'),
    ('comprador', 'Eletricista'),
    ('comprador', 'Encanador'),
    ('comprador', 'Instalação de ar-condicionado'),
    ('vendedor', 'Consórcio')
) as v (categoria, nome)
where not exists (select 1 from parceiros_servico);
