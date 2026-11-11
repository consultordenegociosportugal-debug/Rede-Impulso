import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { escaparHtml } from "@/lib/escapar-html";

// Envia o link de "esqueci minha senha" pelo Resend, em vez de deixar o
// Supabase Auth mandar o e-mail.
//
// Por quê: o e-mail de recuperação do Supabase sai pelo SMTP do próprio
// projeto. Sem SMTP próprio configurado no painel, o Supabase só entrega
// para membros da equipe do projeto (e ~2 por hora no total) — para
// qualquer usuário de verdade o e-mail simplesmente nunca chegava, sem
// erro nenhum na tela. Os outros e-mails do app já saem pelo Resend.
//
// Bônus: o link usa token_hash (verificado no servidor em
// /auth/confirmar), não o fluxo PKCE do resetPasswordForEmail no
// browser — que só funcionava se o link fosse aberto no MESMO navegador
// em que a pessoa pediu (abrir pelo app de e-mail do celular falhava).
//
// Resposta sempre igual exista ou não a conta — não vira um jeito de
// descobrir quem tem cadastro.

const INTERVALO_MINIMO_MS = 60_000;

function baseDoSite(request: NextRequest): string {
  // Nunca monta o link a partir do Host da requisição: quem controla esse
  // header poderia fazer o e-mail apontar o token pra um domínio dele.
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return request.nextUrl.origin;
  return "https://www.redeimpulso.com.br";
}

function escaparLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function POST(request: NextRequest) {
  const { email: emailBruto } = (await request.json().catch(() => ({}))) as { email?: string };
  const email = emailBruto?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ erro: "Informe um e-mail válido." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin || !resendConfigurado()) {
    // Sem service role ou sem Resend nesta instalação: a página cai no
    // fluxo antigo (e-mail mandado pelo próprio Supabase).
    return NextResponse.json({ ok: true, usarFluxoSupabase: true });
  }

  const { data: perfil } = await admin
    .from("profiles")
    .select("id, nome")
    .ilike("email", escaparLike(email))
    .maybeSingle();

  // Freio contra reenvio em sequência (e contra usar a rota pra encher a
  // caixa de alguém): generateLink grava recovery_sent_at no usuário.
  if (perfil) {
    const { data: usuario } = await admin.auth.admin.getUserById(perfil.id);
    const ultimoEnvio = usuario.user?.recovery_sent_at;
    if (ultimoEnvio && Date.now() - new Date(ultimoEnvio).getTime() < INTERVALO_MINIMO_MS) {
      return NextResponse.json(
        { erro: "Acabamos de enviar um link. Aguarde 1 minuto antes de pedir outro." },
        { status: 429 },
      );
    }
  }

  const { data: link, error } = await admin.auth.admin.generateLink({ type: "recovery", email });

  // Conta inexistente cai aqui — responde "ok" do mesmo jeito.
  if (error || !link.properties?.hashed_token) {
    return NextResponse.json({ ok: true });
  }

  const params = new URLSearchParams({
    token_hash: link.properties.hashed_token,
    type: "recovery",
  });
  const url = `${baseDoSite(request)}/auth/confirmar?${params.toString()}`;
  const nome = perfil?.nome ? escaparHtml(perfil.nome) : null;

  try {
    await getResend()!.emails.send({
      from: EMAIL_REMETENTE,
      to: email,
      subject: "Redefinir sua senha da Rede Impulso",
      html: `
        <p>Olá${nome ? `, ${nome}` : ""}.</p>
        <p>Recebemos um pedido para criar uma senha nova na sua conta da Rede Impulso.</p>
        <p><a href="${escaparHtml(url)}" style="display:inline-block;padding:12px 20px;background:#2f6bff;color:#fff;border-radius:8px;text-decoration:none;">Criar senha nova</a></p>
        <p>O link vale por 1 hora e só pode ser usado uma vez. Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.</p>
        ${rodapeTransacionalHtml()}
      `,
    });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível enviar o link agora. Tente de novo em instantes." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
