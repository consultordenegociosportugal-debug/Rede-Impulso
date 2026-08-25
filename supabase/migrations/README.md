# Esquema do banco — Rede Impulso

`0001_init.sql` cria o schema completo. Resumo das tabelas e por que cada uma existe:

## Identidade
- **profiles** — uma linha por pessoa/empresa na plataforma, com `role` (comprador, vendedor, corretor, imobiliaria, cartorio) e status de verificação. Base de tudo.
- **corretor_perfis / imobiliaria_perfis / cartorio_perfis** — extensões 1:1 de `profiles`, só com os campos específicos de cada papel (CRECI e bairros para corretor; CNPJ para imobiliária; registro da serventia para cartório). Comprador e vendedor não precisam de extensão própria — os campos do relatório para eles (documento, fotos do imóvel) já são cobertos por `documentos_verificacao` e `imovel_fotos`.
- **documentos_verificacao** — todo documento de verificação (CNPJ, identidade, CRECI, comprovante) fica aqui, um por linha, com status próprio de análise — em vez de colunas soltas em `profiles`, o que permite reenviar/reprovar um documento sem afetar os outros.

## Imóveis e matching
- **imoveis** — publicado pelo vendedor. `status` controla se já pode entrar no matching (`publicado`) ou não.
- **imovel_fotos** — mínimo de 3 exigido pelo produto; fica em tabela própria por ser 1-para-muitos.
- **sugestoes_corretor** — registro de quem foi sugerido/notificado para cada imóvel, com o score do ranking (bairro + sucesso). Separada de `negocios` porque nem toda sugestão vira negócio — é o registro do próprio matching, não do resultado dele.

## Negócio ponta a ponta
- **negocios** — a tabela central. Uma linha por negócio, do início da negociação até a conclusão. **Decisão de design**: o cartório não tem uma tabela de "processos" separada — os campos `cartorio_id` e `cartorio_status` ficam direto em `negocios`, porque a relação é 1:1 (um negócio tem no máximo um processo de cartório). Isso significa que "a fila de processos do cartório" (seção 6 do relatório) é só `select * from negocios where cartorio_id = :id order by updated_at`, sem join extra.
- **negocio_documentos** — documentos do negócio (contrato, matrícula, escritura), centralizados para o cartório acessar sem gerenciar nada externo à Rede Impulso.

## Mural e pós-negócio
- **depoimentos** — depoimento + estrelas, vinculado ao negócio e ao corretor que intermediou (alimenta tanto o mural quanto o perfil público do corretor).
- **parceiros_servico / ofertas_pos_negocio** — cadastro simples dos prestadores (pintor, eletricista etc.) e o registro de qual oferta foi feita em qual negócio. Como o relatório trata isso como narrativa secundária, o modelo aqui é propositalmente simples — sem funil próprio de conversão.

## O que ficou fora de propósito (v1)
- **Metas históricas do corretor**: `corretor_perfis.meta_mensal` guarda só a meta atual. O relatório mostra "88% da meta" no painel, mas não define se metas mudam mês a mês nem se precisamos do histórico — modelar isso agora seria adivinhar um requisito. Dá pra evoluir para uma tabela `metas_mensais` quando isso for decidido.
- **Regra de desempate cartório**: o relatório deixa em aberto o que acontece quando corretor e cliente indicam cartórios diferentes (seção 13, "próximos passos"). O schema só guarda o `cartorio_id` final — a regra de negócio de como ele é decidido é lógica de aplicação, não de dados, e ainda não foi definida.

## RLS (0002_rls.sql)

Já escrita e aplicada no projeto Supabase. Resumo do modelo de acesso:

- **Público (vitrine/mural/diretório)**: imóveis com `status = 'publicado'` e suas fotos, depoimentos (mural de conquistas), diretório de `parceiros_servico`, e os perfis de corretor/imobiliária/cartório (precisam aparecer no matching e no mural antes mesmo do login).
- **Dono e contrapartes**: `negocios` e tudo que depende dele (`negocio_documentos`, `ofertas_pos_negocio`) só são visíveis para quem participa — comprador, corretor, imobiliária, cartório ou o vendedor via `imoveis`.
- **Só backend (service_role)**: `documentos_verificacao` não tem policy de update (aprovação/rejeição não pode ser feita pelo próprio usuário) e `sugestoes_corretor` não tem policy de insert (o matching automático precisa ser gerado por uma function/edge function com service_role, não pelo cliente).

Isso ainda é uma primeira versão — por exemplo, não modela ainda "um corretor vê os negócios de outro corretor da mesma imobiliária" (só vê os próprios). Ajustar conforme o produto precisar.
