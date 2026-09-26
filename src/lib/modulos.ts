// Interruptor dos módulos da Rede Impulso.
//
// Em 2026-09 a plataforma mudou de foco: tecnologia de apoio a motoristas
// de aplicativo e donos de elétricos. O lado imobiliário (imóveis,
// corretores, cartório, negócios, cursos, serviços pós-negócio) foi
// ADORMECIDO — nada foi apagado: tabelas, dados e código continuam aí.
//
// Para acordar: NEXT_PUBLIC_MODULO_IMOBILIARIO=ativo no .env.local e no
// Vercel, e redeploy. Tudo o que depende deste arquivo volta junto (menu,
// home, rotas, APIs, crons, assistente de imóveis).

export const IMOBILIARIO_ATIVO = process.env.NEXT_PUBLIC_MODULO_IMOBILIARIO === "ativo";

// Rotas (páginas e APIs) do módulo imobiliário. Com o módulo adormecido,
// o proxy manda as páginas para /pausado e responde às APIs com
// { pausado: true } — inclusive aos crons do vercel.json, que assim não
// gastam IA à toa.
export const ROTAS_IMOBILIARIO = [
  "/imoveis",
  "/publicar-imovel",
  "/foto-do-imovel",
  "/favoritos",
  "/cadastro-profissional",
  "/sugestao-corretores",
  "/perfil-corretor",
  "/painel-corretores",
  "/planos",
  "/painel-negocios",
  "/modelos-contratos",
  "/mural-conquistas",
  "/oferta-pos-negocio",
  "/visao-global",
  "/verificacao",
  "/cursos",
  "/meus-cursos",
  "/servicos",
  "/oferecer-servico",
  "/sobre",
  "/admin/assistente",
  "/api/mercado-imobiliario",
  "/api/radar-mercado",
  "/api/identificar-imovel",
  "/api/busca",
  "/api/destaque",
  "/api/assinatura",
  "/api/portugal",
  "/api/google-calendar",
  "/api/servicos",
  "/api/assistente",
];

export function rotaAdormecida(caminho: string) {
  if (IMOBILIARIO_ATIVO) return false;
  return ROTAS_IMOBILIARIO.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
}
