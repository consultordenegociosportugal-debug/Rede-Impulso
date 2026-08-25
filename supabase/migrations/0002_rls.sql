-- ============================================================
-- Rede Impulso — políticas de Row Level Security
-- RLS já foi habilitado em todas as tabelas na migração anterior
-- (rodada com "Run and enable RLS"). Este arquivo define quem pode
-- ler/escrever o quê. Reforça o "enable" aqui também por segurança —
-- é idempotente, não falha se já estiver ligado.
--
-- Princípio geral: dado que o produto tem um lado "vitrine" (OLX) que
-- precisa funcionar sem login, e um lado "operacional" (Homer) que só
-- faz sentido autenticado, cada tabela cai em um dos três padrões:
--   1. Público de leitura (vitrine, mural, diretório de parceiros)
--   2. Só o dono e quem participa do negócio junto com ele
--   3. Só backend/service_role (matching automático, revisão de
--      documentos) — sem política para authenticated/anon, então a
--      chave publicável não consegue escrever nessas linhas.
-- ============================================================

-- ---------- profiles ----------
alter table profiles enable row level security;

-- Corretor, imobiliária e cartório são perfis "públicos" por natureza
-- — precisam aparecer no matching, no mural e nos processos de
-- cartório antes mesmo de o cliente estar logado. Comprador/vendedor
-- só ficam visíveis para si mesmos e para quem está do outro lado de
-- um negócio/imóvel em andamento com eles.
create policy "profiles: leitura publica de profissionais"
  on profiles for select
  to anon, authenticated
  using (role in ('corretor', 'imobiliaria', 'cartorio'));

create policy "profiles: leitura do proprio perfil"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles: leitura por contraparte de negocio"
  on profiles for select
  to authenticated
  using (
    exists (
      select 1 from negocios n
      where (n.comprador_id = profiles.id or n.corretor_id = profiles.id
             or n.imobiliaria_id = profiles.id or n.cartorio_id = profiles.id)
        and (n.comprador_id = auth.uid() or n.corretor_id = auth.uid()
             or n.imobiliaria_id = auth.uid() or n.cartorio_id = auth.uid())
    )
    or exists (
      select 1 from imoveis i where i.vendedor_id = profiles.id and i.vendedor_id = auth.uid()
    )
  );

create policy "profiles: cria o proprio cadastro"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles: edita o proprio cadastro"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- extensões de perfil ----------
alter table corretor_perfis enable row level security;
alter table imobiliaria_perfis enable row level security;
alter table cartorio_perfis enable row level security;

-- Mesma lógica do profiles: dado que o profile já é público quando
-- role = corretor/imobiliaria/cartorio, a extensão também é.
create policy "corretor_perfis: leitura publica"
  on corretor_perfis for select
  to anon, authenticated
  using (true);

create policy "corretor_perfis: dono gerencia o proprio"
  on corretor_perfis for insert
  to authenticated
  with check (auth.uid() = profile_id);

-- Update permite tanto o próprio corretor quanto a imobiliária à qual
-- ele está vinculado — é ela quem ativa/desativa e ajusta permissões
-- no painel de gestão de corretores (seção 9 do relatório).
create policy "corretor_perfis: dono ou imobiliaria vinculada edita"
  on corretor_perfis for update
  to authenticated
  using (auth.uid() = profile_id or auth.uid() = imobiliaria_id)
  with check (auth.uid() = profile_id or auth.uid() = imobiliaria_id);

create policy "imobiliaria_perfis: leitura publica"
  on imobiliaria_perfis for select
  to anon, authenticated
  using (true);

create policy "imobiliaria_perfis: dono gerencia o proprio"
  on imobiliaria_perfis for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "cartorio_perfis: leitura publica"
  on cartorio_perfis for select
  to anon, authenticated
  using (true);

create policy "cartorio_perfis: dono gerencia o proprio"
  on cartorio_perfis for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ---------- documentos_verificacao ----------
alter table documentos_verificacao enable row level security;

-- Documentos são sensíveis (CNPJ, identidade) — nunca públicos. O
-- dono só pode ler e enviar; não existe policy de update, porque
-- aprovar/rejeitar é revisão feita pelo backend (service_role, que
-- ignora RLS), não pelo próprio usuário.
create policy "documentos_verificacao: dono le os proprios"
  on documentos_verificacao for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "documentos_verificacao: dono envia os proprios"
  on documentos_verificacao for insert
  to authenticated
  with check (auth.uid() = profile_id);

-- ---------- imoveis ----------
alter table imoveis enable row level security;

-- A vitrine é pública tipo OLX — imóvel publicado, qualquer um vê,
-- logado ou não.
create policy "imoveis: vitrine publica"
  on imoveis for select
  to anon, authenticated
  using (status = 'publicado');

create policy "imoveis: vendedor ve os proprios em qualquer status"
  on imoveis for select
  to authenticated
  using (auth.uid() = vendedor_id);

create policy "imoveis: corretor ou imobiliaria envolvidos veem"
  on imoveis for select
  to authenticated
  using (
    exists (
      select 1 from negocios n
      where n.imovel_id = imoveis.id
        and (n.corretor_id = auth.uid() or n.imobiliaria_id = auth.uid() or n.cartorio_id = auth.uid())
    )
    or exists (
      select 1 from sugestoes_corretor s
      where s.imovel_id = imoveis.id and s.corretor_id = auth.uid()
    )
  );

create policy "imoveis: vendedor publica o proprio"
  on imoveis for insert
  to authenticated
  with check (auth.uid() = vendedor_id);

create policy "imoveis: vendedor edita o proprio"
  on imoveis for update
  to authenticated
  using (auth.uid() = vendedor_id)
  with check (auth.uid() = vendedor_id);

create policy "imoveis: vendedor remove o proprio"
  on imoveis for delete
  to authenticated
  using (auth.uid() = vendedor_id);

-- ---------- imovel_fotos ----------
alter table imovel_fotos enable row level security;

create policy "imovel_fotos: publicas se o imovel esta publicado"
  on imovel_fotos for select
  to anon, authenticated
  using (
    exists (select 1 from imoveis i where i.id = imovel_fotos.imovel_id and i.status = 'publicado')
  );

create policy "imovel_fotos: vendedor gerencia as do proprio imovel"
  on imovel_fotos for all
  to authenticated
  using (exists (select 1 from imoveis i where i.id = imovel_fotos.imovel_id and i.vendedor_id = auth.uid()))
  with check (exists (select 1 from imoveis i where i.id = imovel_fotos.imovel_id and i.vendedor_id = auth.uid()));

-- ---------- sugestoes_corretor ----------
alter table sugestoes_corretor enable row level security;

-- Sem policy de insert: o matching é gerado pelo backend
-- (service_role), não pelo cliente. Corretor e vendedor só leem.
create policy "sugestoes_corretor: corretor sugerido ve"
  on sugestoes_corretor for select
  to authenticated
  using (auth.uid() = corretor_id);

create policy "sugestoes_corretor: vendedor do imovel ve"
  on sugestoes_corretor for select
  to authenticated
  using (exists (select 1 from imoveis i where i.id = sugestoes_corretor.imovel_id and i.vendedor_id = auth.uid()));

-- ---------- negocios ----------
alter table negocios enable row level security;

create policy "negocios: partes envolvidas leem"
  on negocios for select
  to authenticated
  using (
    auth.uid() = comprador_id or auth.uid() = corretor_id
    or auth.uid() = imobiliaria_id or auth.uid() = cartorio_id
    or exists (select 1 from imoveis i where i.id = negocios.imovel_id and i.vendedor_id = auth.uid())
  );

-- Quem abre um negócio é o comprador, o corretor ou a imobiliária que
-- fez a intermediação — o vendedor participa via `imoveis`, não
-- precisa estar entre os criadores diretos.
create policy "negocios: comprador corretor ou imobiliaria abrem"
  on negocios for insert
  to authenticated
  with check (
    auth.uid() = comprador_id or auth.uid() = corretor_id or auth.uid() = imobiliaria_id
  );

create policy "negocios: partes envolvidas atualizam"
  on negocios for update
  to authenticated
  using (
    auth.uid() = comprador_id or auth.uid() = corretor_id
    or auth.uid() = imobiliaria_id or auth.uid() = cartorio_id
    or exists (select 1 from imoveis i where i.id = negocios.imovel_id and i.vendedor_id = auth.uid())
  )
  with check (
    auth.uid() = comprador_id or auth.uid() = corretor_id
    or auth.uid() = imobiliaria_id or auth.uid() = cartorio_id
    or exists (select 1 from imoveis i where i.id = negocios.imovel_id and i.vendedor_id = auth.uid())
  );

-- ---------- negocio_documentos ----------
alter table negocio_documentos enable row level security;

create policy "negocio_documentos: partes do negocio leem e enviam"
  on negocio_documentos for all
  to authenticated
  using (
    exists (
      select 1 from negocios n
      where n.id = negocio_documentos.negocio_id
        and (n.comprador_id = auth.uid() or n.corretor_id = auth.uid()
             or n.imobiliaria_id = auth.uid() or n.cartorio_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from negocios n
      where n.id = negocio_documentos.negocio_id
        and (n.comprador_id = auth.uid() or n.corretor_id = auth.uid()
             or n.imobiliaria_id = auth.uid() or n.cartorio_id = auth.uid())
    )
  );

-- ---------- depoimentos (mural de conquistas) ----------
alter table depoimentos enable row level security;

-- O mural é prova social pública — esse é o ponto central da seção 10
-- do relatório, então leitura é sempre aberta.
create policy "depoimentos: mural e publico"
  on depoimentos for select
  to anon, authenticated
  using (true);

-- Só quem participou do negócio (comprador ou vendedor) pode deixar
-- depoimento sobre ele.
create policy "depoimentos: comprador ou vendedor do negocio publicam"
  on depoimentos for insert
  to authenticated
  with check (
    auth.uid() = autor_id
    and exists (
      select 1 from negocios n
      left join imoveis i on i.id = n.imovel_id
      where n.id = depoimentos.negocio_id
        and (n.comprador_id = auth.uid() or i.vendedor_id = auth.uid())
    )
  );

-- ---------- parceiros_servico (pintor, eletricista etc.) ----------
alter table parceiros_servico enable row level security;

-- Diretório público de parceiros; cadastro/edição fica com o backend
-- por enquanto (não há perfil de "parceiro" entre os 5 perfis do
-- produto).
create policy "parceiros_servico: diretorio publico"
  on parceiros_servico for select
  to anon, authenticated
  using (ativo);

-- ---------- ofertas_pos_negocio ----------
alter table ofertas_pos_negocio enable row level security;

create policy "ofertas_pos_negocio: partes do negocio leem e criam"
  on ofertas_pos_negocio for all
  to authenticated
  using (
    exists (
      select 1 from negocios n
      left join imoveis i on i.id = n.imovel_id
      where n.id = ofertas_pos_negocio.negocio_id
        and (n.comprador_id = auth.uid() or i.vendedor_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from negocios n
      left join imoveis i on i.id = n.imovel_id
      where n.id = ofertas_pos_negocio.negocio_id
        and (n.comprador_id = auth.uid() or i.vendedor_id = auth.uid())
    )
  );
