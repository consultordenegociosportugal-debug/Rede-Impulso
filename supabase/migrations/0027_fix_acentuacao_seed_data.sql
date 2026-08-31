-- ============================================================
-- Corrige perda de acentuação em dados seed
--
-- As migrations 0006 (parceiros_servico) e 0013 (cursos) gravam texto
-- acentuado, mas os registros em produção estão sem acentos — o SQL
-- foi transliterado em algum ponto entre o arquivo e o banco (não é
-- mojibake; é remoção limpa de diacríticos). Esta migration realinha
-- os dados de produção com o texto original dos arquivos de origem.
-- Casa pelo valor atual (sem acento) para ser idempotente.
-- ============================================================

update cursos set
  titulo = 'Negociação avançada para corretores',
  descricao = 'Técnicas de negociação e fechamento aplicadas ao mercado imobiliário local.'
where titulo = 'Negociacao avancada para corretores';

update cursos set
  titulo = 'Gestão de equipes para imobiliárias',
  descricao = 'Como estruturar metas, ranking e distribuição de leads entre corretores.'
where titulo = 'Gestao de equipes para imobiliarias';

update cursos set
  titulo = 'Atualização em registro de imóveis',
  descricao = 'Mudanças recentes na legislação de registro e escritura para cartórios.'
where titulo = 'Atualizacao em registro de imoveis';

update cursos set
  titulo = 'Fundamentos do mercado imobiliário',
  descricao = 'Introdução completa para quem está começando em qualquer ponta da rede.'
where titulo = 'Fundamentos do mercado imobiliario';

update parceiros_servico set nome = 'Instalação de ar-condicionado'
where nome = 'Instalacao de ar-condicionado';

update parceiros_servico set nome = 'Consórcio'
where nome = 'Consorcio' and categoria = 'vendedor';
