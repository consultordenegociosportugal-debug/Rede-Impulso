import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você revisa textos curtos de anúncios e depoimentos da Rede Impulso, uma
plataforma imobiliária brasileira. Corrija ortografia, gramática e pontuação, e melhore a redação
deixando o texto mais claro e natural em português do Brasil — sem inventar nenhuma informação que
não esteja no texto original (nunca acrescente características, preços, endereços ou elogios que a
pessoa não escreveu). Mantenha o tamanho e o tom parecidos com o original. Responda só com o texto
revisado, sem aspas, sem comentários, sem explicar o que mudou.`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { erro: "Correção de texto indisponível no momento." },
      { status: 503 },
    );
  }

  const { texto } = (await request.json()) as { texto?: string };
  const original = (texto ?? "").trim();

  if (!original) {
    return NextResponse.json({ erro: "Escreva algum texto antes de pedir sugestões." }, { status: 400 });
  }
  if (original.length > 2000) {
    return NextResponse.json({ erro: "Texto longo demais para revisar." }, { status: 400 });
  }

  const resposta = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: original }],
  });

  const sugestao = resposta.content
    .filter((bloco) => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("\n")
    .trim();

  return NextResponse.json({ sugestao });
}
