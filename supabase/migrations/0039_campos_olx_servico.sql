-- ============================================================
-- Rede Impulso — campos "estilo OLX" no cadastro de prestador de serviço
--
-- Mesmo levantamento da 0037/0038, agora em parceiros_servico. O
-- cadastro de serviço só tinha tipo + WhatsApp — nem um anúncio da
-- categoria "Serviços" da OLX, que é propositalmente simples, deixa de
-- ter nome do negócio, uma descrição curta, preço de referência e
-- cidade de atendimento. Aqui o diretório é fechado (só aparece pra
-- quem concluiu negócio), mas quando há mais de um prestador do mesmo
-- tipo esses quatro campos são o que ajuda a escolher entre eles.
-- ============================================================

alter table parceiros_servico add column nome_negocio text;
alter table parceiros_servico add column descricao text;
alter table parceiros_servico add column preco_a_partir numeric(10, 2);
alter table parceiros_servico add column cidade text;
