import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você é um analista imobiliário da Rede Impulso. Vai receber a foto de um
prédio ou casa fotografado na rua por um possível comprador, junto com o endereço aproximado
de onde a foto foi tirada.

Descreva o imóvel com base SOMENTE no que é visível na foto — nunca invente número de quartos,
metragem ou preço, já que isso não dá pra ver de fora. Responda em JSON estrito, sem texto fora
do JSON, no formato:

{
  "tipo_construcao": "apartamento" | "casa" | "comercial" | "terreno" | "outro",
  "padrao": "econômico" | "médio" | "alto padrão",
  "estado_aparente": "descrição curta do estado de conservação",
  "caracteristicas": ["lista de 3 a 6 características visíveis, ex: fachada em tijolo aparente, portão eletrônico, varanda gourmet"],
  "descricao_completa": "um parágrafo natural de 3-4 frases descrevendo o imóvel para alguém que não viu a foto, mencionando o endereço aproximado quando fizer sentido"
}`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { erro: "Identificação por foto indisponível no momento." },
      { status: 503 },
    );
  }

  const { imagemBase64, mediaType, endereco } = (await request.json()) as {
    imagemBase64?: string;
    mediaType?: string;
    endereco?: string | null;
  };

  if (!imagemBase64 || !mediaType) {
    return NextResponse.json({ erro: "Foto ausente." }, { status: 400 });
  }

  const tiposAceitos = ["image/jpeg", "image/png", "image/webp"] as const;
  if (!tiposAceitos.includes(mediaType as (typeof tiposAceitos)[number])) {
    return NextResponse.json({ erro: "Formato de imagem não suportado." }, { status: 400 });
  }

  try {
    const resposta = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
                data: imagemBase64,
              },
            },
            {
              type: "text",
              text: endereco
                ? `Endereço aproximado da foto: ${endereco}`
                : "Endereço não disponível.",
            },
          ],
        },
      ],
    });

    const texto = resposta.content
      .filter((bloco) => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join("\n")
      .trim();

    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ erro: "Não consegui analisar essa foto." }, { status: 502 });
    }

    const analise = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analise });
  } catch {
    return NextResponse.json(
      { erro: "Não consegui analisar essa foto agora. Tente de novo." },
      { status: 502 },
    );
  }
}
