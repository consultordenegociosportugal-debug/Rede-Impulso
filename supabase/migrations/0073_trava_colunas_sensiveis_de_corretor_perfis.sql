-- ============================================================
-- Rede Impulso — trava colunas sensíveis de corretor_perfis por
-- privilégio, não só por linha
--
-- Mesma vulnerabilidade da 0072, outra tabela: "corretor_perfis: dono
-- edita o proprio" (migração 0062) só verifica auth.uid() = profile_id
-- — RLS por LINHA, não por COLUNA. `estrelas` e `total_negocios` são
-- exibidos PUBLICAMENTE no perfil do corretor (/perfil-corretor) como
-- selo de confiança pro cliente decidir se agenda ou não — e nenhum
-- código da aplicação nunca escreve nessas duas colunas (confirmado:
-- zero trigger, zero function, zero update em todo o projeto). Sem
-- esta trava, qualquer corretor podia forjar a própria nota e a
-- própria contagem de negócios direto (supabase.from('corretor_perfis')
-- .update({estrelas: 5, total_negocios: 999})), sem nenhuma visita ou
-- avaliação real por trás — fraude de reputação pura.
--
-- `ativo` e `meta_mensal` também nunca são escritos por nada hoje —
-- travados pelo mesmo motivo: se um dia virarem um controle
-- administrativo (ex.: desativar um corretor problemático) ou uma meta
-- definida por um gestor, não devem nascer autosserviço.
revoke update on corretor_perfis from authenticated;
grant update (creci, bairros_atuacao, cidade, organizacao_catalogo_id, cpf)
  on corretor_perfis to authenticated;
