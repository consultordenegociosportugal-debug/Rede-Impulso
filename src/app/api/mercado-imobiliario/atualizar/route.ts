import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Job diário que pesquisa o mercado imobiliário Brasil/Portugal/EUA e
// grava o retrato do dia em mercado_imobiliario_snapshots (migração
// 0028). O assistente (api/assistente) lê essa tabela em vez de
// pesquisar na web a cada pergunta — mais barato e mais rápido no chat,
// ao custo de até 24h de atraso no dado. Disparado pelo Vercel Cron
// (ver vercel.json); protegido por CRON_SECRET porque a function do
// banco que grava aqui é security definer, sem sessão de usuário.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_PESQUISA = `Você pesquisa o mercado imobiliário para a Rede Impulso, uma
plataforma imobiliária que atua no Brasil e serve também consultores com clientes em Portugal e
nos Estados Unidos. Sua tarefa é pesquisar — usando busca na web de verdade, nunca conhecimento
estático — o panorama do dia nesses três mercados, cobrindo para CADA um dos três:

1. Preços e índices (variação de venda/aluguel — FipeZap no Brasil, Confidencial Imobiliário/INE
   em Portugal, Case-Shiller/NAR nos EUA)
2. Juros e financiamento (Selic/CDI no Brasil, Euribor em Portugal, taxa hipotecária de 30 anos
   nos EUA)
3. Notícias e tendências relevantes do setor
4. Ranking de corretores/imobiliárias que mais fecham negócios (RealTrends nos EUA, rankings de
   VGV/franquias no Brasil, RE/MAX/Century 21/ERA em Portugal) — esses rankings costumam ser
   anuais, não diários: sempre indique o ano/período a que o ranking se refere
5. Oportunidades de investimento (yield de aluguel, regiões em alta, comparativo entre os três)

Pesquise os três mercados com o mesmo nível de esforço — não é aceitável pesquisar só um ou dois.
Cite a fonte e a data de cada dado importante (ex.: "Euribor 6M em 2,772%, Banco de Portugal,
25/08/2026"). Se um índice for mensal ou anual em vez de diário, diga isso explicitamente em vez
de apresentar como dado do dia. Termine com um parágrafo de leitura cruzada dos três mercados:
onde está a melhor relação risco/retorno agora.`;

// Versão básica do web_search, não a com dynamic filtering
// (web_search_20260209+) — essa exige tool calling programático, que
// não é garantido em claude-sonnet-4-5, e este job roda sozinho todo
// dia sem ninguém pra notar um 400 silencioso.
const TOOL_PESQUISA: Anthropic.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 20 },
];

type PaisDados = {
  preco_indices: string;
  juros_financiamento: string;
  noticias_tendencias: string;
  ranking_corretores: string;
  oportunidade_investimento: string;
};

const PAIS_PROPERTIES = {
  type: "object" as const,
  required: [
    "preco_indices",
    "juros_financiamento",
    "noticias_tendencias",
    "ranking_corretores",
    "oportunidade_investimento",
  ],
  properties: {
    preco_indices: { type: "string", description: "Preços e índices, com fonte e data." },
    juros_financiamento: { type: "string", description: "Juros e condições de financiamento, com fonte e data." },
    noticias_tendencias: { type: "string", description: "Notícias e tendências relevantes do setor." },
    ranking_corretores: {
      type: "string",
      description: "Ranking de corretores/imobiliárias que mais fecham negócios, com o ano/período do ranking explícito.",
    },
    oportunidade_investimento: { type: "string", description: "Onde está a oportunidade de investimento neste mercado." },
  },
};

const TOOL_ESTRUTURAR: Anthropic.Tool[] = [
  {
    name: "salvar_resultado",
    description: "Salva o retrato estruturado do dia do mercado imobiliário Brasil/Portugal/EUA.",
    input_schema: {
      type: "object",
      required: ["resumo_executivo", "paises", "oportunidades_comparativas"],
      properties: {
        resumo_executivo: {
          type: "string",
          description: "3 a 5 frases com os pontos mais importantes do dia entre os três mercados.",
        },
        paises: {
          type: "object",
          required: ["brasil", "portugal", "eua"],
          properties: {
            brasil: PAIS_PROPERTIES,
            portugal: PAIS_PROPERTIES,
            eua: PAIS_PROPERTIES,
          },
        },
        oportunidades_comparativas: {
          type: "string",
          description: "Leitura cruzada final: onde está a melhor relação risco/retorno agora, comparando os três mercados.",
        },
      },
    },
  },
];

function autorizado(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ erro: "ANTHROPIC_API_KEY ausente." }, { status: 503 });
  }

  const hoje = new Date().toISOString().slice(0, 10);

  const pesquisa = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: SYSTEM_PROMPT_PESQUISA,
    tools: TOOL_PESQUISA,
    messages: [
      {
        role: "user",
        content: `Pesquise e resuma o panorama de hoje (${hoje}) do mercado imobiliário no Brasil, em Portugal e nos Estados Unidos.`,
      },
    ],
  });

  const pesquisaTexto = pesquisa.content
    .filter((bloco) => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("\n\n")
    .trim();

  if (!pesquisaTexto) {
    return NextResponse.json({ erro: "Pesquisa não retornou conteúdo." }, { status: 502 });
  }

  const estruturar = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system:
      "Você organiza uma pesquisa de mercado imobiliário já pronta em dados estruturados, " +
      "sem adicionar nem inventar nenhuma informação nova — só reorganize o que já foi pesquisado, " +
      "mantendo as citações de fonte e data que já estavam no texto.",
    tools: TOOL_ESTRUTURAR,
    tool_choice: { type: "tool", name: "salvar_resultado" },
    messages: [
      {
        role: "user",
        content: `Pesquisa pronta sobre o mercado imobiliário Brasil/Portugal/EUA de hoje (${hoje}):\n\n${pesquisaTexto}\n\nOrganize isso chamando a ferramenta salvar_resultado.`,
      },
    ],
  });

  const usoDeFerramenta = estruturar.content.find(
    (bloco) => bloco.type === "tool_use",
  ) as Anthropic.ToolUseBlock | undefined;

  if (!usoDeFerramenta) {
    return NextResponse.json({ erro: "Não foi possível estruturar o resultado." }, { status: 502 });
  }

  const dados = usoDeFerramenta.input as {
    resumo_executivo: string;
    paises: { brasil: PaisDados; portugal: PaisDados; eua: PaisDados };
    oportunidades_comparativas: string;
  };

  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_mercado_imobiliario_snapshot", {
    p_data_referencia: hoje,
    p_resumo_executivo: dados.resumo_executivo,
    p_paises: dados.paises,
    p_oportunidades_comparativas: dados.oportunidades_comparativas,
  });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data_referencia: hoje });
}
