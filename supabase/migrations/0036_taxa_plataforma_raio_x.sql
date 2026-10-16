-- ============================================================
-- Rede Impulso Motorista — taxa das plataformas no Raio-X
--
-- Quem informa o valor BRUTO das corridas (o que o passageiro pagou) precisa
-- descontar o que Uber/99/inDrive ficam. O Raio-X passa a tratar a taxa como
-- um custo (src/lib/motorista/raio-x.ts). Nulo ou 0 = o faturamento já é o
-- líquido, o que as plataformas depositaram — o comportamento de antes.
--
-- Aplicar ANTES de publicar o código novo: o salvamento do Raio-X grava esta
-- coluna e falha se ela não existir.
-- ============================================================

alter table motorista_perfis
  add column taxa_plataforma numeric(4, 1)
  check (taxa_plataforma between 0 and 100);

comment on column motorista_perfis.taxa_plataforma is 'Percentual médio que as plataformas ficam de cada corrida. Nulo = faturamento já líquido. Mesma RLS da tabela: só o dono lê e escreve.';
