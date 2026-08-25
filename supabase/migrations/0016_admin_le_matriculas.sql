create policy "matriculas: admin le todas"
  on matriculas for select
  to authenticated
  using (public.is_admin());
