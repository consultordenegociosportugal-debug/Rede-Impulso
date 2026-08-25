-- Mural de conquistas e publico (depoimentos ja e "using (true)"),
-- mas o negocio e o imovel por tras de cada depoimento so ficavam
-- visiveis pras partes envolvidas. Sem isso o embed
-- negocios(imoveis(...)) volta nulo pra qualquer visitante que nao
-- seja comprador/vendedor/corretor daquele negocio.
--
-- Sem risco de recursao: a nova policy de negocios so consulta
-- depoimentos (policy "using (true)", sem dependencia de volta), e a
-- nova policy de imoveis consulta negocios+depoimentos — nenhuma das
-- duas reaciona a propria RLS de imoveis.

create policy "negocios: publico ve se tem depoimento"
  on negocios for select
  to anon, authenticated
  using (exists (select 1 from depoimentos d where d.negocio_id = negocios.id));

create policy "imoveis: publico ve se o negocio tem depoimento"
  on imoveis for select
  to anon, authenticated
  using (
    exists (
      select 1 from negocios n
      join depoimentos d on d.negocio_id = n.id
      where n.imovel_id = imoveis.id
    )
  );
