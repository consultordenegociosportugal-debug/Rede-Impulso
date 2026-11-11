import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino do link de "esqueci minha senha" (/api/auth/esqueci-senha).
 *
 * Verifica o token_hash no servidor — a sessão vai pros cookies aqui
 * mesmo, então funciona em qualquer navegador/aparelho em que a pessoa
 * abrir o e-mail (o fluxo PKCE do /auth/callback exige o mesmo
 * navegador em que o link foi pedido).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  function urlAbsoluta(caminho: string) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const ehLocal = process.env.NODE_ENV === "development";
    const base = !ehLocal && forwardedHost ? `https://${forwardedHost}` : origin;
    return `${base}${caminho}`;
  }

  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");

  if (!tokenHash || tipo !== "recovery") {
    return NextResponse.redirect(urlAbsoluta("/redefinir-senha"));
  }

  // Se o link expirou ou já foi usado, verifyOtp falha e não cria sessão
  // — /redefinir-senha já trata isso ("esse link não é mais válido" +
  // botão de pedir outro), então o destino é o mesmo nos dois casos.
  const supabase = await createClient();
  await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });

  return NextResponse.redirect(urlAbsoluta("/redefinir-senha"));
}
