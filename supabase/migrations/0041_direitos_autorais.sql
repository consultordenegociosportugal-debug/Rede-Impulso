-- ============================================================
-- Rede Impulso — canal de denúncia de direitos autorais + remoção
--
-- O Marco Civil da Internet (Lei 12.965/2014, art. 19 §2º) trata
-- direitos autorais como exceção à regra geral de "só remove por
-- ordem judicial": para violação de direitos autorais a lei especial
-- (ainda não editada) ou, na prática corrente, a notificação direta
-- do titular já é suficiente para a plataforma agir — por isso esse
-- canal não exige conta nem login: o titular do direito pode nem ter
-- cadastro na Rede Impulso.
--
-- Fluxo: formulário público em /direitos-autorais -> grava aqui ->
-- admin revisa em /admin/direitos-autorais -> se procedente, o admin
-- usa as ferramentas que já existem (editar imóvel, status do
-- veículo etc.) pra de fato tirar o conteúdo do ar e marca a denúncia
-- como resolvida. Não existe remoção automática por URL aqui de
-- propósito — um parser de URL adivinhando qual tabela/linha apagar é
-- frágil demais para delete de conteúdo de terceiros.
-- ============================================================

create type denuncia_direitos_status as enum ('pendente', 'em_analise', 'procedente', 'improcedente');

create table denuncias_direitos_autorais (
  id uuid primary key default gen_random_uuid(),
  url_conteudo text not null,
  descricao_obra text not null,
  titular_nome text not null,
  titular_email text not null,
  detalhes text,
  declaracao_boa_fe boolean not null default false,
  denunciante_id uuid references profiles (id) on delete set null,
  status denuncia_direitos_status not null default 'pendente',
  resposta_admin text,
  revisado_por uuid references profiles (id) on delete set null,
  revisado_em timestamptz,
  created_at timestamptz not null default now()
);

comment on table denuncias_direitos_autorais is 'Canal de notice-and-takedown de direitos autorais (Marco Civil art. 19 §2º) — aberto a quem não tem conta na plataforma.';

create index on denuncias_direitos_autorais (status);

alter table denuncias_direitos_autorais enable row level security;

-- Qualquer um pode denunciar — inclusive quem não tem conta. Sem
-- select liberado pra anon/authenticated: ninguém lê denúncia alheia,
-- só admin.
create policy "denuncias_direitos_autorais: qualquer um denuncia"
  on denuncias_direitos_autorais for insert
  to anon, authenticated
  with check (declaracao_boa_fe = true);

create policy "denuncias_direitos_autorais: admin le todas"
  on denuncias_direitos_autorais for select
  to authenticated
  using (public.is_admin());

create function public.revisar_denuncia_direitos_autorais(
  p_id uuid,
  p_novo_status denuncia_direitos_status,
  p_resposta text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update denuncias_direitos_autorais
  set status = p_novo_status,
      resposta_admin = p_resposta,
      revisado_por = auth.uid(),
      revisado_em = now()
  where id = p_id;
end;
$$;

grant execute on function public.revisar_denuncia_direitos_autorais(uuid, denuncia_direitos_status, text) to authenticated;
