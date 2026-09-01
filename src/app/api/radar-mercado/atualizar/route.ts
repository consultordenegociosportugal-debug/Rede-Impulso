import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Job diário que pesquisa o mercado imobiliário brasileiro e grava um
// punhado de manchetes curtas e públicas em radar_mercado_diario
// (migração 0030), lidas pelo ticker "Radar do mercado" da landing
// page. Disparado pelo Vercel Cron (ver vercel.json); protegido por
// CRON_SECRET porque a function do banco que grava aqui é security
// definer, sem sessão de usuário — mesmo padrão de
// /api/destaque/webhook e /api/assinatura/webhook.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_PESQUISA = `Você pesquisa o mercado imobiliário brasileiro para a Rede
Impulso. Pesquise — usando busca na web de verdade, nunca conhecimento estático — o panorama de
hoje: variação de preços de venda/aluguel (FipeZap ou fonte equivalente), taxa Selic e condições de
financiamento habitacional, e as notícias mais relevantes do setor imobiliário no Brasil nas
últimas 24-48h. Cite fonte e data de cada dado.`;

const TOOL_PESQUISA: Anthropic.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 10 },
];

const TOOL_ESTRUTURAR: Anthropic.Tool[] = [
  {
    name: "salvar_manchetes",
    description: "Salva as manchetes curtas do dia sobre o mercado imobiliário brasileiro.",
    input_schema: {
      type: "object",
      required: ["manchetes"],
      properties: {
        manchetes: {
          type: "array",
          minItems: 4,
          maxItems: 6,
          description: "4 a 6 manchetes curtas, cada uma factual e verificável pela pesquisa.",
          items: {
            type: "object",
            required: ["tag", "texto"],
            properties: {
              tag: {
                type: "string",
                description: "Rótulo curto de 1-2 palavras, ex: 'Selic', 'FipeZap', 'Financiamento'.",
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

  const pesquisa = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT_PESQUISA,
    tools: TOOL_PESQUISA,
    messages: [
      {
        role: "user",
        content: `Pesquise o panorama de hoje (${hoje}) do mercado imobiliário no Brasil: preços, Selic/financiamento e notícias do setor.`,
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
      "Você transforma uma pesquisa de mercado imobiliário já pronta em manchetes curtas, " +
      "estilo ticker de jornal, para a home de um site imobiliário. Sem inventar nada — só " +
      "reduza o que já foi pesquisado a frases curtas e diretas, mantendo os números e fontes " +
      "que já estavam no texto. Português do Brasil.",
    tools: TOOL_ESTRUTURAR,
    tool_choice: { type: "tool", name: "salvar_manchetes" },
    messages: [
      {
        role: "user",
        content: `Pesquisa pronta sobre o mercado imobiliário brasileiro de hoje (${hoje}):\n\n${pesquisaTexto}\n\nOrganize isso em manchetes curtas chamando a ferramenta salvar_manchetes.`,
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
}
