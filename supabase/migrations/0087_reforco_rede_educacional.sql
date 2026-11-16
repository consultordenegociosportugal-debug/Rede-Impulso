-- ============================================================
-- Rede Impulso — reforço da rede educacional
--
-- Até aqui, cursos só existiam direto no banco (inseridos à mão na
-- migração 0013) e matrícula não dava acesso a nada — nem material,
-- nem certificado. Esta migração:
--   1. dá ao admin CRUD completo sobre cursos (hoje só tinha select
--      público quando ativo=true) e sobre as matrículas (pra marcar
--      pago/concluído manualmente enquanto o Mercado Pago não entra);
--   2. cria curso_materiais (PDF/apostila por aula, visível só pra
--      quem tem matrícula ativa naquele curso, ou pro admin);
--   3. cria o bucket de storage correspondente, privado, só PDF;
--   4. adiciona mais cursos ao catálogo.
--
-- Pagamento via Mercado Pago continua fora desta migração — matrícula
-- nasce 'pendente_pagamento' como já era; o acesso a material aqui é
-- liberado pra qualquer matrícula não cancelada (mesma realidade de
-- negócio que já existia: "matricular" nunca cobrou nada de verdade).
-- Quando o Mercado Pago entrar, é decisão à parte travar isso a 'pago'.
-- ============================================================

create policy "cursos: admin gerencia"
  on cursos for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "matriculas: admin gerencia"
  on matriculas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table curso_materiais (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos (id) on delete cascade,
  titulo text not null,
  arquivo_url text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table curso_materiais is 'PDF/apostila de uma aula do curso — visível só pra quem tem matrícula não cancelada naquele curso, ou pro admin.';

create index on curso_materiais (curso_id);

alter table curso_materiais enable row level security;

create policy "curso_materiais: matriculado ou admin le"
  on curso_materiais for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from matriculas m
      where m.curso_id = curso_materiais.curso_id
        and m.profile_id = auth.uid()
        and m.status <> 'cancelado'
    )
  );

create policy "curso_materiais: admin gerencia"
  on curso_materiais for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('curso-materiais', 'curso-materiais', false, array['application/pdf'], 20971520) -- 20 MB
on conflict (id) do nothing;

-- Convenção de caminho: {curso_id}/{arquivo} — a mesma lógica de
-- "matriculado ou admin" da tabela vale pro arquivo em si.
create policy "curso-materiais: matriculado ou admin le"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'curso-materiais'
    and (
      public.is_admin()
      or exists (
        select 1 from matriculas m
        where m.curso_id::text = (storage.foldername(name))[1]
          and m.profile_id = auth.uid()
          and m.status <> 'cancelado'
      )
    )
  );

create policy "curso-materiais: admin envia e gerencia"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'curso-materiais' and public.is_admin());

create policy "curso-materiais: admin atualiza"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'curso-materiais' and public.is_admin());

create policy "curso-materiais: admin exclui"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'curso-materiais' and public.is_admin());

-- Mais cursos no catálogo, além dos 4 da migração 0013.
insert into cursos (titulo, descricao, instrutor, publico, carga_horaria, preco) values
  ('Marketing digital para corretores', 'Como usar Instagram e WhatsApp pra gerar e qualificar leads imobiliários sem depender de portal pago.', 'Rede Impulso', 'corretor', 6, 167.00),
  ('Fotografia e tour virtual de imóveis', 'Técnicas simples de fotografia com celular e como montar um tour virtual que converte mais visitas em propostas.', 'Rede Impulso', 'corretor', 4, 127.00),
  ('Atendimento e experiência do cliente', 'Como conduzir a visita, lidar com objeções e fechar sem parecer vendedor insistente.', 'Rede Impulso', 'todos', 5, 157.00),
  ('LGPD e proteção de dados no imobiliário', 'O que toda imobiliária e corretor precisa saber sobre dados de clientes na prática do dia a dia.', 'Rede Impulso', 'imobiliaria', 3, 177.00),
  ('Due diligence imobiliária para cartórios', 'Checklist prático de documentação e riscos mais comuns na análise de um imóvel antes do registro.', 'Rede Impulso', 'cartorio', 5, 247.00);
