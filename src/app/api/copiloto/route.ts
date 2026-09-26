import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { conversar, type MensagemChat } from "@/lib/copiloto/conversar";

// Copiloto do motorista (fase 2 do foco em motoristas): chat que responde
// com os dados reais da plataforma — o Raio-X de quem pergunta, o radar
// do dia, eletropostos, oficinas e elétricos à venda — e busca na web
// quando precisa de algo que a plataforma não tem (ver
// src/lib/copiloto/conversar.ts).
//
// Exige login: cada resposta custa chamada de IA, e sem conta não há como
// conter abuso. Também é o que permite ler o Raio-X da própria pessoa.

export const maxDuration = 120;

const MAX_MENSAGENS = 12;
const MAX_CARACTERES = 2000;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ erro: "Copiloto indisponível no momento." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Entre na sua conta para falar com o copiloto." }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as { messages?: MensagemChat[] } | null;
  const historico = (corpo?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MENSAGENS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }));

  // A conversa tem de começar e terminar com a pessoa.
  while (historico.length && historico[0].role !== "user") historico.shift();
  if (historico.length === 0 || historico[historico.length - 1].role !== "user") {
    return NextResponse.json({ erro: "Mensagem vazia." }, { status: 400 });
  }

  try {
    return NextResponse.json(await conversar(supabase, user.id, historico));
  } catch (erro) {
    if (erro instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ erro: "Muita gente perguntando agora. Tenta de novo em instantes?" }, { status: 429 });
    }
    if (erro instanceof Anthropic.APIError) {
      return NextResponse.json({ erro: "O copiloto teve um problema. Tenta de novo?" }, { status: 502 });
    }
    throw erro;
  }
}
