import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lerConfig, montarUrlConsentimento } from "@/lib/google-calendar";

// Início do fluxo OAuth2: manda o corretor para a tela de
// consentimento do Google. Sem as variáveis de ambiente configuradas,
// volta para o painel com um aviso em vez de quebrar — mesma postura
// do /api/assistente quando falta a ANTHROPIC_API_KEY.
export async function GET(request: NextRequest) {
  const config = lerConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/painel-negocios?google=nao_configurado", request.url),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/entrar?depois=/painel-negocios", request.url),
    );
  }

  // `state` guardado em cookie httpOnly e conferido no callback —
  // evita que alguém force a conexão da conta Google dela na sessão
  // de outra pessoa (CSRF de OAuth).
  const state = crypto.randomUUID();

  const resposta = NextResponse.redirect(montarUrlConsentimento(config, state));
  resposta.cookies.set("google_calendar_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return resposta;
}
