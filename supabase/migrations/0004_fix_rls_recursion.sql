-- ============================================================
-- Rede Impulso — corrige recursão infinita no RLS
--
-- Erro real: "infinite recursion detected in policy for relation
-- negocios" (Postgres 42P17). Causa: RLS se aplica recursivamente a
-- subqueries, e duas policies referenciavam a tabela uma da outra:
--   - negocios (leitura) consultava imoveis (vendedor_id)
--   - imoveis (leitura) consultava negocios (corretor/imobiliaria/cartorio)
--   - imoveis (leitura) também consultava sugestoes_corretor
--   - sugestoes_corretor (leitura) consultava imoveis (vendedor_id)
-- Cada consulta reavalia o RLS da tabela referenciada, formando um
-- ciclo. profiles também caía nesse ciclo ao consultar negocios.
--
-- Solução padrão do Postgres/Supabase: mover a checagem cruzada para
-- functions security definer, que rodam com o privilégio do dono
-- (postgres, que tem bypassrls) e não reacionam o RLS da tabela
-- consultada — quebrando o ciclo.
-- ============================================================

create function public.is_imovel_vendedor(p_imovel_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from imoveis where id = p_imovel_id and vendedor_id = auth.uid()
  );
$$;

create function public.negocio_vincula_profissional(p_imovel_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from negocios
    where imovel_id = p_imovel_id
      and (corretor_id = auth.uid() or imobiliaria_id = auth.uid() or cartorio_id = auth.uid())
  );
$$;

create function public.foi_sugerido_para_imovel(p_imovel_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from sugestoes_corretor where imovel_id = p_imovel_id and corretor_id = auth.uid()
  );
$$;

drop policy "profiles: leitura por contraparte de negocio" on profiles;
create policy "profiles: leitura por contraparte de negocio" on profiles for select to authenticated using (
  exists (
    select 1 from negocios n
    where (n.comprador_id = profiles.id or n.corretor_id = profiles.id or n.imobiliaria_id = profiles.id or n.cartorio_id = profiles.id)
      and (n.comprador_id = auth.uid() or n.corretor_id = auth.uid() or n.imobiliaria_id = auth.uid() or n.cartorio_id = auth.uid())
  )
);

drop policy "negocios: partes envolvidas leem" on negocios;
create policy "negocios: partes envolvidas leem" on negocios for select to authenticated using (
  auth.uid() = comprador_id or auth.uid() = corretor_id or auth.uid() = imobiliaria_id or auth.uid() = cartorio_id or public.is_imovel_vendedor(imovel_id)
);

drop policy "negocios: partes envolvidas atualizam" on negocios;
create policy "negocios: partes envolvidas atualizam" on negocios for update to authenticated
  using (auth.uid() = comprador_id or auth.uid() = corretor_id or auth.uid() = imobiliaria_id or auth.uid() = cartorio_id or public.is_imovel_vendedor(imovel_id))
  with check (auth.uid() = comprador_id or auth.uid() = corretor_id or auth.uid() = imobiliaria_id or auth.uid() = cartorio_id or public.is_imovel_vendedor(imovel_id));

drop policy "imoveis: corretor ou imobiliaria envolvidos veem" on imoveis;
create policy "imoveis: corretor ou imobiliaria envolvidos veem" on imoveis for select to authenticated using (
  public.negocio_vincula_profissional(id) or public.foi_sugerido_para_imovel(id)
);

drop policy "sugestoes_corretor: vendedor do imovel ve" on sugestoes_corretor;
create policy "sugestoes_corretor: vendedor do imovel ve" on sugestoes_corretor for select to authenticated using (
  public.is_imovel_vendedor(imovel_id)
);
