// Interruptor dos módulos da Rede Impulso.
//
// Em 2026-10 a plataforma girou de novo: o foco agora é só o agendamento
// direto entre corretor e cliente (modelo AppBarber) — o NÚCLEO PERMANENTE
// da plataforma passa a ser cadastro + agenda, não mais a vitrine de
// imóveis nem os planos de equipe por tamanho.
//
// Mobilidade (motorista de aplicativo + elétricos) e agora também a
// vitrine de imóveis/planos de equipe ADORMECEM: nada foi apagado —
// tabelas, dados e código continuam aí, só ficam inacessíveis via UI.
//
// Para acordar um módulo de novo: a env var correspondente = "ativo" no
// .env.local e no Vercel, e redeploy. Tudo o que depende deste arquivo
// volta junto (menu, rotas, APIs, crons).

export const IMOBILIARIO_ATIVO = true;

export const MOBILIDADE_ATIVA = process.env.NEXT_PUBLIC_MODULO_MOBILIDADE === "ativo";

// Vitrine de imóveis (publicar/buscar/favoritar/destacar) e os planos de
// assinatura por tamanho de equipe — pausados desde o pivô para
// agendamento direto cliente↔corretor. O cadastro de corretor, o
// dashboard e o agendamento (visitas, disponibilidade) não dependem
// disto e continuam ativos sempre.
export const MARKETPLACE_ATIVO = process.env.NEXT_PUBLIC_MARKETPLACE_IMOVEIS === "ativo";

// Rotas (páginas e APIs) do módulo de mobilidade. Com o módulo adormecido,
// o proxy manda as páginas para /pausado e responde às APIs com
// { pausado: true } — inclusive aos crons do vercel.json, que assim não
// gastam IA à toa.
export const ROTAS_MOBILIDADE = [
  "/motorista",
  "/eletricos",
  "/admin/agentes",
  "/api/motorista",
  "/api/agentes-eletricos",
  "/api/copiloto",
];

// Rotas da vitrine de imóveis e dos planos/equipe — mesmo mecanismo de
// dormência acima, independente da mobilidade.
export const ROTAS_MARKETPLACE = [
  "/imoveis",
  "/publicar-imovel",
  "/favoritos",
  "/foto-do-imovel",
  "/mural-conquistas",
  "/oferta-pos-negocio",
  "/sugestao-corretores",
  "/servicos",
  "/oferecer-servico",
  "/modelos-contratos",
  "/direitos-autorais",
  "/visao-global",
  "/planos",
  "/painel-corretores",
  "/convite-equipe",
  "/api/busca",
  "/api/identificar-imovel",
  "/api/mercado-imobiliario",
  "/api/radar-mercado",
  "/api/portugal",
  "/api/destaque",
  "/api/servicos/destacar",
  "/api/texto",
  "/api/assistente",
  "/api/assinatura",
  "/api/equipe",
];

export function rotaAdormecida(caminho: string) {
  const mobilidade =
    !MOBILIDADE_ATIVA &&
    ROTAS_MOBILIDADE.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
  const marketplace =
    !MARKETPLACE_ATIVO &&
    ROTAS_MARKETPLACE.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
  return mobilidade || marketplace;
}
