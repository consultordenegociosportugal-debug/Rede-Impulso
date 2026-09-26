import type { SupabaseClient } from "@supabase/supabase-js";
import {
  estruturar,
  numeroOuNulo,
  objeto,
  pesquisar,
  textoOuNulo,
} from "@/lib/agentes-eletricos/comum";

// Agente do Radar do motorista (migração 0034): uma vez por dia pesquisa
// o que muda o bolso de quem roda por aplicativo e grava um resumo curto,
// com cidade/UF em cada item para a página filtrar pela região.

export const CATEGORIAS_RADAR = ["combustivel", "recarga", "demanda", "clima", "plataformas", "dica"] as const;

export type ItemRadar = {
  categoria: (typeof CATEGORIAS_RADAR)[number];
  titulo: string;
  texto: string;
  cidade: string | null;
  estado: string | null;
  fonte: string | null;
};

type Resultado = {
  itens: ItemRadar[];
  precos_referencia: {
    gasolina: number | null;
    etanol: number | null;
    diesel: number | null;
    gnv: number | null;
    fonte: string | null;
  };
};

const REGRAS = `Você é o agente do "Radar do motorista" da Rede Impulso, um guia diário para motoristas
de aplicativo no Brasil (Uber, 99, inDrive e outros). Use SEMPRE a busca na web — nunca conhecimento
estático — e cite a URL de cada informação. Só traga o que muda o dia ou o bolso do motorista. Sem
sensacionalismo; se não achar evidência confiável, deixe de fora. Português do Brasil, linguagem direta.`;

const CAPITAIS = "São Paulo, Rio de Janeiro, Belo Horizonte, Brasília, Salvador, Fortaleza, Recife, Curitiba, Porto Alegre, Goiânia, Manaus e Belém";

// Quando o modelo traz a cidade mas esquece a UF, o item vazaria para o
// Brasil todo — completa pela capital.
const UF_DA_CIDADE: Record<string, string> = {
  "são paulo": "SP", "rio de janeiro": "RJ", "belo horizonte": "MG", "brasília": "DF",
  "salvador": "BA", "fortaleza": "CE", "recife": "PE", "curitiba": "PR", "porto alegre": "RS",
  "goiânia": "GO", "manaus": "AM", "belém": "PA", "florianópolis": "SC", "vitória": "ES",
  "campinas": "SP", "natal": "RN", "joão pessoa": "PB", "maceió": "AL", "aracaju": "SE",
  "teresina": "PI", "são luís": "MA", "cuiabá": "MT", "campo grande": "MS", "palmas": "TO",
  "porto velho": "RO", "rio branco": "AC", "macapá": "AP", "boa vista": "RR",
};

export function completarUf(item: ItemRadar): ItemRadar {
  if (item.estado || !item.cidade) return item;
  const uf = UF_DA_CIDADE[item.cidade.trim().toLowerCase()];
  return uf ? { ...item, estado: uf } : item;
}

const SCHEMA = objeto({
  itens: {
    type: "array",
    items: objeto({
      categoria: { type: "string", enum: [...CATEGORIAS_RADAR] },
      titulo: { type: "string", description: "Manchete curta, até ~70 caracteres." },
      texto: { type: "string", description: "1 a 3 frases com o dado, o impacto para o motorista e a data." },
      cidade: textoOuNulo,
      estado: {
        type: ["string", "null"],
        description: "Sigla da UF (obrigatória sempre que houver cidade), ou null se vale para o Brasil todo.",
      },
      fonte: textoOuNulo,
    }),
  },
  precos_referencia: objeto({
    gasolina: numeroOuNulo,
    etanol: numeroOuNulo,
    diesel: numeroOuNulo,
    gnv: numeroOuNulo,
    fonte: { type: ["string", "null"], description: "Ex: 'ANP, semana de 14 a 20/09/2026'." },
  }),
});

export async function gerarRadarMotorista(supabase: SupabaseClient, hoje: string) {
  const pesquisa = await pesquisar(
    `Monte o radar de hoje (${hoje}). Cubra, nesta ordem de prioridade:
1. Combustível: preço médio da última semana da ANP (gasolina, etanol, diesel, GNV) no Brasil e
   mudanças relevantes por estado; em quais estados o etanol compensa (até 70% do preço da gasolina).
2. Recarga de elétricos: promoções e descontos de redes/apps de recarga, novas estações relevantes.
3. Demanda: eventos dos próximos 3 dias nas capitais (${CAPITAIS}) que aumentam a procura por
   corridas — jogos, shows, feriados, congressos, greves de transporte público.
4. Clima: alertas de chuva forte/temporal que afetam o trânsito nas capitais.
5. Plataformas: mudanças de tarifa, regras, categorias, promoções para motoristas e regulamentação
   (leis, projetos, decisões) da Uber, 99, inDrive e afins.
6. Uma dica prática do dia para aumentar o lucro ou reduzir custo, com base em fonte.`,
    "Faça a pesquisa e escreva o radar de hoje com fontes.",
    REGRAS,
  );

  const resultado = await estruturar<Resultado>(
    "Gere de 8 a 15 itens. Em cada item, cidade/estado só quando o fato é local; null quando vale para o Brasil todo. " +
      "precos_referencia são as médias NACIONAIS da ANP (R$ por litro; GNV por m³).",
    pesquisa,
    SCHEMA,
  );

  const itens = resultado.itens
    .filter((item) => item.titulo.trim() && (!item.fonte || /^https?:\/\//.test(item.fonte)))
    .map(completarUf);

  const { error } = await supabase.from("motorista_radar").upsert(
    {
      data_referencia: hoje,
      itens,
      precos_referencia: resultado.precos_referencia,
    },
    { onConflict: "data_referencia" },
  );

  if (error) throw new Error(error.message);
  return { itens: itens.length, precos_referencia: resultado.precos_referencia };
}
