-- ============================================================
-- Rede Impulso — novo papel: Construtora/Incorporadora
--
-- Levantamento no AppBarber (appbarber.com.br), seção "Como você vai
-- usar": lá são só 3 opções (dono do estabelecimento, profissional,
-- cliente). No mercado imobiliário existe uma quarta ponta que o
-- corretor autônomo e a imobiliária tradicional não cobrem bem: quem
-- lança empreendimentos na planta (construtora/incorporadora).
--
-- ATENÇÃO: este arquivo PRECISA rodar sozinho, numa execução própria,
-- antes de qualquer outro que use o valor 'construtora' — o Postgres
-- não deixa usar um valor de enum na mesma transação em que ele foi
-- criado (mesma regra do 'cobertura' na migração 0037).
-- ============================================================

alter type user_role add value 'construtora';
