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

## Inteligência de mercado (0028)
- **mercado_imobiliario_snapshots** — retrato diário comparativo do mercado imobiliário em Brasil, Portugal e EUA (preços/índices, juros/financiamento, notícias, ranking de corretores/imobiliárias e oportunidades de investimento), gerado 1x por dia por um cron (`/api/mercado-imobiliario/atualizar`) e consumido pelo assistente de IA via a ferramenta `consultar_mercado_imobiliario`. Só corretor e imobiliária enxergam essa ferramenta/tabela — decisão de produto, não limitação técnica. Escrita é feita sem sessão de usuário (é um cron), então segue o mesmo padrão de `confirmar_assinatura`: function `security definer`, endpoint protegido por `CRON_SECRET`.

## Rede Impulso Elétricos (0032)

Novo braço da rede, para o mundo dos carros elétricos no Brasil (visão de
expandir depois, como `/visao-global` já faz para o imobiliário em Portugal).
Quatro tabelas de diretório/vitrine, cada uma com o mesmo padrão de RLS do
resto do produto (leitura pública, escrita restrita ao dono):

- **ev_veiculos / ev_veiculo_fotos** — marketplace de compra e venda,
  mesma lógica de `imoveis` (vitrine pública quando `status = 'publicado'`),
  com bucket de storage próprio (`ev-veiculo-fotos`).
- **ev_eletropostos** — diretório de recarga alimentado pela comunidade;
  lat/long é opcional (começa como lista por cidade, mapa vem depois).
- **ev_oficinas** — diretório de oficinas/assistência especializada em
  elétricos, cadastro aberto (auto-serviço) por ainda ser escasso no Brasil.
- **ev_posts / ev_comentarios** — feed de comunidade (dúvida, comparação,
  experiência, notícia), sem threading nem moderação em v1.

**Decisão de design**: não reaproveita `user_role`/as extensões de perfil do
imobiliário (corretor/imobiliaria/cartorio) — aqui qualquer `profile`, seja
qual for seu papel do lado imóveis, pode vender um carro, cadastrar um
eletroposto/oficina ou postar. Um papel dedicado (ex: "concessionaria") fica
para quando o produto precisar mesmo diferenciar permissões.

## Agentes autônomos de elétricos (0033)

Quatro agentes diários (`/api/agentes-eletricos/executar?agente=…`, um
horário por agente no `vercel.json`) que pesquisam na web e propõem mudanças:
curadoria do marketplace (selo de preço vs. FIPE), mapa de eletropostos
(novos pontos e pontos fechados), atendimento da comunidade (resposta para
posts sem resposta) e prospecção de oficinas (novas oficinas + mensagem de
convite, enviada à mão pelo admin).

- **ev_agentes** — modo de cada agente: `aprovacao` (padrão) ou `autonomo`.
- **ev_agente_sugestoes** — fila; o admin aprova/rejeita em `/admin/agentes`
  via `aplicar_sugestao_agente` / `rejeitar_sugestao_agente`.

**Decisão de design**: ao contrário do radar (0030), os agentes escrevem com a
**service role** (`SUPABASE_SERVICE_ROLE_KEY`), não por function liberada para
`anon` — no modo autônomo eles escrevem direto nos diretórios públicos, e uma
function aberta para `anon` deixaria qualquer um com a chave pública fazer o
mesmo. `ev_comentarios.autor_id` virou opcional para permitir comentário com
`autor_agente` (sempre exatamente um dos dois).

## Rede Impulso Motorista (0034)

Guia para motoristas de aplicativo (Uber, 99, inDrive…), rotas `/motorista`
e `/motorista/raio-x`.

- **motorista_perfis** — números do "Raio-X do lucro real" (rotina, carro,
  custos, faturamento). Dado sensível de renda: RLS só para o próprio dono.
  O cálculo em si é no navegador (`src/lib/motorista/raio-x.ts`).
- **motorista_radar** — resumo diário público (combustível, recarga, eventos
  que aumentam a demanda, clima, regras das plataformas), gerado pelo cron
  `/api/motorista/radar/atualizar` com a service role, como os agentes de 0033.

Sem integração com as contas das plataformas — o motorista informa os ganhos.

## O que ficou fora de propósito (v1)
- **Metas históricas do corretor**: `corretor_perfis.meta_mensal` guarda só a meta atual. O relatório mostra "88% da meta" no painel, mas não define se metas mudam mês a mês nem se precisamos do histórico — modelar isso agora seria adivinhar um requisito. Dá pra evoluir para uma tabela `metas_mensais` quando isso for decidido.
- **Regra de desempate cartório**: o relatório deixa em aberto o que acontece quando corretor e cliente indicam cartórios diferentes (seção 13, "próximos passos"). O schema só guarda o `cartorio_id` final — a regra de negócio de como ele é decidido é lógica de aplicação, não de dados, e ainda não foi definida.

## RLS (0002_rls.sql)

Já escrita e aplicada no projeto Supabase. Resumo do modelo de acesso:

- **Público (vitrine/mural/diretório)**: imóveis com `status = 'publicado'` e suas fotos, depoimentos (mural de conquistas), diretório de `parceiros_servico`, e os perfis de corretor/imobiliária/cartório (precisam aparecer no matching e no mural antes mesmo do login).
- **Dono e contrapartes**: `negocios` e tudo que depende dele (`negocio_documentos`, `ofertas_pos_negocio`) só são visíveis para quem participa — comprador, corretor, imobiliária, cartório ou o vendedor via `imoveis`.
- **Só backend (service_role)**: `documentos_verificacao` não tem policy de update (aprovação/rejeição não pode ser feita pelo próprio usuário) e `sugestoes_corretor` não tem policy de insert (o matching automático precisa ser gerado por uma function/edge function com service_role, não pelo cliente).

Isso ainda é uma primeira versão — por exemplo, não modela ainda "um corretor vê os negócios de outro corretor da mesma imobiliária" (só vê os próprios). Ajustar conforme o produto precisar.
