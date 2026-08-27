import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calcularExpiracao,
  lerConfig,
  trocarCodigoPorTokens,
} from "@/lib/google-calendar";

// Retorno do consentimento do Google. Troca o `code` pelos tokens e
// guarda em google_calendar_conexoes (RLS: só a própria linha).
// Sempre termina redirecionando para o painel com ?google=<estado>,
// nunca com uma tela de erro crua.
export async function GET(request: NextRequest) {
  const paraPainel = (estado: string) =>
    NextResponse.redirect(new URL(`/painel-negocios?google=${estado}`, request.url));

  const config = lerConfig();
  if (!config) return paraPainel("nao_configurado");

  const { searchParams } = new URL(request.url);

  // O usuário pode simplesmente recusar na tela do Google.
  if (searchParams.get("error")) return paraPainel("negado");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const stateEsperado = request.cookies.get("google_calendar_state")?.value;

  if (!code || !state || !stateEsperado || state !== stateEsperado) {
    return paraPainel("erro");
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

  const tokens = await trocarCodigoPorTokens(config, code);
  if (!tokens?.access_token) return paraPainel("erro");

  // O refresh_token só vem na primeira autorização (ou com
  // prompt=consent). Se não veio, o campo fica de fora do upsert para
  // preservar o que já estava salvo — sobrescrever com nulo mataria a
  // conexão silenciosamente.
  const registro: Record<string, string> = {
    profile_id: user.id,
    access_token: tokens.access_token,
    expira_em: calcularExpiracao(tokens.expires_in),
    conectado_em: new Date().toISOString(),
  };
  if (tokens.refresh_token) registro.refresh_token = tokens.refresh_token;

  const { error } = await supabase
    .from("google_calendar_conexoes")
    .upsert(registro, { onConflict: "profile_id" });

  if (error) return paraPainel("erro");

  const resposta = paraPainel("conectado");
  resposta.cookies.delete("google_calendar_state");
  return resposta;
}
