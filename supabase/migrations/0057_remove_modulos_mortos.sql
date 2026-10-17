-- ============================================================
-- Rede Impulso — remove de vez o que não é mais o produto
--
-- Decisão do dono: "nosso sistema é de gestão de agendamentos para
-- profissionais e empresas no ramo imobiliário" — tudo que sobrou dos
-- pivôs anteriores (marketplace de imóveis, motorista de app,
-- elétricos) sai do banco, não só da navegação.
--
-- Mantido de propósito, mesmo não sendo 100% "agendamento":
--   - documentos_verificacao / TIPOS_POR_ROLE (corretor): verificação
--     de identidade/CRECI segue disponível, só deixou de ser
--     obrigatória pra usar o painel.
--   - depoimentos: perde o vínculo com `negocios` (coluna negocio_id),
--     mas a tabela continua existindo — mural de avaliação do corretor.
--   - user_role continua com os valores antigos (vendedor, imobiliaria,
--     construtora, cartorio) porque o Postgres não permite remover
--     valor de enum. Ficam órfãos — nenhum fluxo de cadastro atribui
--     esses papéis a partir de agora.
--
-- Esta migration só reescreve funções/trigger e troca as policies de
-- `visitas` que dependiam do conceito "vendedor do imóvel". As tabelas
-- do marketplace/mobilidade em si são removidas na 0058, em separado.
-- ============================================================

-- Sem os ramos de imobiliária/construtora — as tabelas de extensão
-- deles (imobiliaria_perfis/construtora_perfis) somem na 0058.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  v_role user_role;
  v_role_texto text := nullif(trim(meta->>'role'), '');
  v_nome text;
  v_data_nascimento date;
  v_cidade text;
begin
  if v_role_texto is not null
     and exists (
       select 1 from unnest(enum_range(null::user_role)) as r
       where r::text = v_role_texto
     )
  then
    v_role := v_role_texto::user_role;
  else
    v_role := 'comprador';
  end if;

  v_nome := coalesce(
    nullif(trim(meta->>'nome'), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    ''
  );

  v_cidade := nullif(trim(coalesce(meta->>'cidade', '')), '');

  begin
    v_data_nascimento := nullif(meta->>'data_nascimento', '')::date;
    if v_data_nascimento is not null
       and v_data_nascimento > current_date - interval '18 years'
    then
      v_data_nascimento := null;
    end if;
  exception when others then
    v_data_nascimento := null;
  end;

  insert into public.profiles (
    id, role, nome, telefone, email, rede_social, foto_url, termos_aceitos_em, data_nascimento
  )
  values (
    new.id,
    v_role,
    v_nome,
    nullif(trim(coalesce(meta->>'telefone', '')), ''),
    new.email,
    nullif(meta->>'rede_social', ''),
    nullif(coalesce(meta->>'avatar_url', meta->>'picture'), ''),
    now(),
    v_data_nascimento
  )
  on conflict (id) do nothing;

  if v_role = 'corretor' then
    insert into public.corretor_perfis (profile_id, creci, bairros_atuacao, cidade)
    values (
      new.id,
      coalesce(meta->>'creci', ''),
      case
        when jsonb_exists(meta, 'bairros_atuacao')
          then (select coalesce(array_agg(value), '{}') from jsonb_array_elements_text(meta->'bairros_atuacao'))
        else '{}'::text[]
      end,
      v_cidade
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is 'Cria a linha em profiles (e em corretor_perfis, se for o papel) a partir dos metadados do signUp ou do provedor OAuth. Sem role/nome (login social) cai para comprador.';

-- Sem o imóvel — a visita sempre nasce com corretor_id explícito agora
-- (agendamento direto), então quem é contraparte é só quem agendou
-- (comprador_id) e quem recebe (corretor_id).
create or replace function public.e_contraparte_de_visita(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from visitas v
    where v.comprador_id = p_profile_id
      and v.corretor_id = auth.uid()
  );
$$;

drop trigger if exists trg_visitas_define_corretor on visitas;
drop function if exists public.visitas_define_corretor();
drop function if exists public.corretor_responsavel_imovel(uuid);

-- Repõe o acesso de visitas sem o conceito de "vendedor do imóvel" —
-- a policy antiga some quando a coluna visitas.imovel_id cair na 0058
-- (ela usava essa coluna na cláusula USING).
create policy "visitas: corretor ve as suas"
  on visitas for select
  to authenticated
  using (auth.uid() = corretor_id);

create policy "visitas: corretor atualiza as suas"
  on visitas for update
  to authenticated
  using (auth.uid() = corretor_id)
  with check (auth.uid() = corretor_id);
