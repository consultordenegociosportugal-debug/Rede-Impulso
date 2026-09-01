import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você interpreta buscas em linguagem natural de quem procura imóvel na Rede
Impulso e extrai os filtros estruturados correspondentes. A pessoa já escolheu comprar ou alugar
antes de digitar — não tente adivinhar isso, só extraia o resto do que ela descreveu. Nunca invente
um valor que não esteja implícito no texto; deixe o campo de fora se não tiver certeza.`;

const FERRAMENTA: Anthropic.Tool = {
  name: "extrair_filtros",
  description: "Registra os filtros de busca de imóvel extraídos do texto livre.",
  input_schema: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["apartamento", "casa", "kitnet", "terreno", "comercial", "outro"],
        description: "Tipo de imóvel, se mencionado.",
      },
      bairro: { type: "string", description: "Bairro procurado, se mencionado." },
      cidade: { type: "string", description: "Cidade procurada, se mencionado." },
      preco_max: { type: "number", description: "Preço máximo em reais, se mencionado." },
      quartos_min: { type: "number", description: "Número mínimo de quartos, se mencionado." },
    },
  },
};

type Filtros = {
  tipo?: string;
  bairro?: string;
  cidade?: string;
  preco_max?: number;
  quartos_min?: number;
};

export async function POST(request: NextRequest) {
  const { texto } = (await request.json()) as { texto?: string };
  const original = (texto ?? "").trim();

  // Camada opcional: sem chave configurada (ou qualquer falha), a
  // busca cai de volta pro comportamento literal de sempre — bairro
  // = o texto digitado. Nunca mostra erro pra quem só quer buscar.
  if (!original) {
    return NextResponse.json({});
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ bairro: original });
  }

  try {
    const resposta = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      tools: [FERRAMENTA],
      tool_choice: { type: "tool", name: "extrair_filtros" },
      messages: [{ role: "user", content: original.slice(0, 300) }],
    });

    const uso = resposta.content.find((bloco) => bloco.type === "tool_use") as
      | Anthropic.ToolUseBlock
      | undefined;

    if (!uso) {
      return NextResponse.json({ bairro: original });
    }

    const filtros = uso.input as Filtros;

    // Se a IA não achou nada estruturado no texto, mantém o
    // comportamento antigo (bairro literal) em vez de devolver vazio.
    if (Object.keys(filtros).length === 0) {
      return NextResponse.json({ bairro: original });
    }

    return NextResponse.json(filtros);
  } catch {
    return NextResponse.json({ bairro: original });
  }
}
