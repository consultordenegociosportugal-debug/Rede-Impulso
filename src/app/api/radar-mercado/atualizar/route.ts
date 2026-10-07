import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Job diário que pesquisa o mercado imobiliário, financeiro e de negócios
// (câmbio já vem de src/lib/cotacoes.ts via API dedicada — aqui é Ibovespa,
// bolsas globais e notícias) e grava um punhado de manchetes curtas e
// públicas em radar_mercado_diario (migração 0030), lidas pelo ticker
// "Radar do mercado" da landing page. Disparado pelo Vercel Cron (ver
// vercel.json); protegido por CRON_SECRET porque a function do banco que
// grava aqui é security definer, sem sessão de usuário — mesmo padrão de
// /api/destaque/webhook e /api/assinatura/webhook.
//
// Não existe API pública/gratuita do Google Finance — por isso usamos
// busca na web real (igual o Google Finance faz por trás) via a tool
// web_search da Anthropic, com citação de fonte e data obrigatórias, em
// vez de tentar raspar a página do Google (frágil e contra os termos de
// uso deles).

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_PESQUISA = `Você pesquisa o panorama diário de mercado para a Rede Impulso,
uma plataforma que atua com imóveis, motoristas de aplicativo e veículos elétricos no Brasil.
Pesquise — usando busca na web de verdade, nunca conhecimento estático — quatro frentes:
1) Mercado imobiliário: variação de preços de venda/aluguel (FipeZap ou fonte equivalente), taxa
   Selic e condições de financiamento habitacional.
2) Bolsa e câmbio: fechamento ou nível atual do Ibovespa, e panorama rápido de bolsas globais
   relevantes (Dow Jones, Nasdaq, S&P 500) quando houver dado do dia.
3) Negócios e economia: as notícias mais relevantes de negócios, economia e mercado no Brasil nas
   últimas 24-48h (fusões, resultados de empresas, decisões do Banco Central, indicadores
   macroeconômicos).
4) Setor imobiliário: notícias específicas do setor no Brasil nas últimas 24-48h.
Cite fonte e data de cada dado — nunca invente números.`;

const TOOL_PESQUISA: Anthropic.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 10 },
];

const TOOL_ESTRUTURAR: Anthropic.Tool[] = [
  {
    name: "salvar_manchetes",
    description:
      "Salva as manchetes curtas do dia sobre mercado imobiliário, bolsa/câmbio e negócios no Brasil.",
    input_schema: {
      type: "object",
      required: ["manchetes"],
      properties: {
        manchetes: {
          type: "array",
          minItems: 5,
          maxItems: 8,
          description:
            "5 a 8 manchetes curtas, cada uma factual e verificável pela pesquisa, cobrindo as " +
            "quatro frentes pesquisadas (imóveis, bolsa/câmbio, negócios/economia, setor " +
            "imobiliário) — não concentre tudo em uma única frente.",
          items: {
            type: "object",
            required: ["tag", "texto"],
            properties: {
              tag: {
                type: "string",
                description:
                  "Rótulo curto de 1-2 palavras, ex: 'Selic', 'FipeZap', 'Ibovespa', 'Bolsa', 'Negócios'.",
              },
              texto: {
                type: "string",
                description: "Uma frase curta e direta, estilo manchete de jornal, com o dado ou fato.",
              },
            },
          },
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

  try {
    const pesquisa = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT_PESQUISA,
      tools: TOOL_PESQUISA,
      messages: [
        {
          role: "user",
          content: `Pesquise o panorama de hoje (${hoje}): mercado imobiliário no Brasil (preços, Selic/financiamento, notícias do setor), Ibovespa e bolsas globais, e as principais notícias de negócios/economia do Brasil.`,
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
      max_tokens: 1024,
      system:
        "Você transforma uma pesquisa de mercado (imóveis, bolsa/câmbio e negócios) já pronta em " +
        "manchetes curtas, estilo ticker de jornal, para a home de uma plataforma brasileira. Sem " +
        "inventar nada — só reduza o que já foi pesquisado a frases curtas e diretas, mantendo os " +
        "números e fontes que já estavam no texto, e distribua as manchetes entre as frentes " +
        "pesquisadas em vez de repetir a mesma. Português do Brasil.",
      tools: TOOL_ESTRUTURAR,
      tool_choice: { type: "tool", name: "salvar_manchetes" },
      messages: [
        {
          role: "user",
          content: `Pesquisa pronta sobre mercado imobiliário, bolsa/câmbio e negócios no Brasil hoje (${hoje}):\n\n${pesquisaTexto}\n\nOrganize isso em manchetes curtas chamando a ferramenta salvar_manchetes.`,
        },
      ],
    });

    const usoDeFerramenta = estruturar.content.find(
      (bloco) => bloco.type === "tool_use",
    ) as Anthropic.ToolUseBlock | undefined;

    if (!usoDeFerramenta) {
      return NextResponse.json({ erro: "Não foi possível estruturar o resultado." }, { status: 502 });
    }

    const { manchetes } = usoDeFerramenta.input as { manchetes: { tag: string; texto: string }[] };

    const supabase = await createClient();
    const { error } = await supabase.rpc("salvar_radar_mercado_diario", {
      p_data_referencia: hoje,
      p_manchetes: manchetes,
    });

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data_referencia: hoje, manchetes });
  } catch {
    return NextResponse.json({ erro: "Não foi possível atualizar o radar de mercado agora." }, { status: 502 });
  }
}
