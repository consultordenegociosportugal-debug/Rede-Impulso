import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinoPosLogin } from "@/lib/destino-pos-login";

/**
 * Retorno do login social (Google / Facebook) via Supabase Auth.
 *
 * O provedor devolve o usuário para cá com `?code=...`; trocamos esse
 * code pela sessão (que o cliente de servidor grava nos cookies) e só
 * então decidimos o destino — usando exatamente a mesma regra do login
 * por e-mail/senha em /entrar, mais o desvio para /completar-cadastro
 * quando o perfil ainda não tem telefone.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Atrás do proxy da Vercel, `origin` pode não ser o host que o
  // usuário está vendo — o host real vem em x-forwarded-host.
  function urlAbsoluta(caminho: string) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const ehLocal = process.env.NODE_ENV === "development";
    const base = !ehLocal && forwardedHost ? `https://${forwardedHost}` : origin;
    return `${base}${caminho}`;
  }

  function voltarComErro(mensagem: string) {
    const params = new URLSearchParams({ erro: mensagem });
    const depois = searchParams.get("depois");
    if (depois) params.set("depois", depois);
    return NextResponse.redirect(urlAbsoluta(`/entrar?${params.toString()}`));
  }

  // O provedor cancelado/negado volta com error em vez de code
  // (ex.: usuário fechou a janela do Google, provider não habilitado).
  const erroProvedor =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (erroProvedor) return voltarComErro(erroProvedor);

  const code = searchParams.get("code");
  if (!code) {
    return voltarComErro(
      "O login social não retornou o código de autorização. Tente de novo.",
    );
  }

  const supabase = await createClient();

  // `sb_flow_id` chega quando há mais de um fluxo PKCE em andamento —
  // sem ele o SDK usa o verifier mais recente, que pode ser de outro.
  const flowId = searchParams.get("sb_flow_id");
  const { data, error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error || !data.user) {
    return voltarComErro(
      error?.message ?? "Não foi possível concluir o login social.",
    );
  }

  const destino = await destinoPosLogin(supabase, data.user.id, {
    depois: searchParams.get("depois"),
    exigirCadastroCompleto: true,
    papelSugerido: searchParams.get("papel"),
  });

  return NextResponse.redirect(urlAbsoluta(destino));
}
