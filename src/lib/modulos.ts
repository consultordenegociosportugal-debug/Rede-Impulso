// Interruptor dos módulos da Rede Impulso.
//
// Em 2026-10 a plataforma girou de novo: o foco agora é o agendamento e a
// gestão dos leads entre corretor/imobiliária/construtora e cliente — o
// lado imobiliário volta a ser o NÚCLEO PERMANENTE da plataforma.
//
// Mobilidade (motorista de aplicativo + elétricos), que foi o núcleo entre
// 2026-09 e 2026-10, agora ADORMECE: nada foi apagado — tabelas, dados e
// código continuam aí.
//
// Para acordar a mobilidade de novo: NEXT_PUBLIC_MODULO_MOBILIDADE=ativo
// no .env.local e no Vercel, e redeploy. Tudo o que depende deste arquivo
// volta junto (menu, home, rotas, APIs, crons, copiloto do motorista).

export const IMOBILIARIO_ATIVO = true;

export const MOBILIDADE_ATIVA = process.env.NEXT_PUBLIC_MODULO_MOBILIDADE === "ativo";

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

export function rotaAdormecida(caminho: string) {
  if (MOBILIDADE_ATIVA) return false;
  return ROTAS_MOBILIDADE.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
}
