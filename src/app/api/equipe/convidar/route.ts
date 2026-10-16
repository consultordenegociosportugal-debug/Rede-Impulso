import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Convite de equipe: só a imobiliária manda, só o corretor aceita (ver
// comentário na migração 0047 sobre por que isso não é um INSERT direto
// em corretor_perfis).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "imobiliaria") {
    return NextResponse.json(
      { erro: "Só contas de imobiliária podem convidar corretores." },
      { status: 403 },
    );
  }

  const { email } = await request.json();
  const emailNormalizado = (email ?? "").trim().toLowerCase();

  if (!EMAIL_REGEX.test(emailNormalizado)) {
    return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  }

  const { data: imobiliariaPerfil } = await supabase
    .from("imobiliaria_perfis")
    .select("nome_fantasia")
    .eq("profile_id", user.id)
    .single();

  const nomeImobiliaria = imobiliariaPerfil?.nome_fantasia || profile?.nome || "Uma imobiliária";

  const { data: convite, error } = await supabase
    .from("convites_equipe")
    .insert({ imobiliaria_id: user.id, email: emailNormalizado })
    .select("token")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { erro: "Já existe um convite pendente para esse e-mail." },
        { status: 409 },
      );
    }
    return NextResponse.json({ erro: "Não foi possível criar o convite." }, { status: 500 });
  }

  const linkConvite = `${new URL(request.url).origin}/convite-equipe/${convite.token}`;

  if (!resendConfigurado()) {
    return NextResponse.json({
      ok: true,
      email_enviado: false,
      aviso: "RESEND_API_KEY ausente — convite criado, mas nenhum e-mail foi enviado.",
      link: linkConvite,
    });
  }

  const resend = getResend()!;
  const { error: erroEnvio } = await resend.emails.send({
    from: EMAIL_REMETENTE,
    to: emailNormalizado,
    subject: `${nomeImobiliaria} te convidou para a equipe na Rede Impulso`,
    html: `
      <p>Olá!</p>
      <p><strong>${nomeImobiliaria}</strong> te convidou para entrar na equipe de corretores dela na Rede Impulso.</p>
      <p><a href="${linkConvite}">Ver convite e responder →</a></p>
      <p>Se você ainda não tem conta de corretor na Rede Impulso, pode criar uma e depois voltar nesse mesmo link para aceitar.</p>
      ${rodapeTransacionalHtml()}
    `,
  });

  return NextResponse.json({
    ok: true,
    email_enviado: !erroEnvio,
    aviso: erroEnvio ? "Convite criado, mas o e-mail falhou ao enviar." : undefined,
    link: linkConvite,
  });
}
