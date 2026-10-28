import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";

export async function POST(request: NextRequest) {
  const { nome, email, telefone, assunto, mensagem } = (await request.json()) as {
    nome?: string;
    email?: string;
    telefone?: string;
    assunto?: string;
    mensagem?: string;
  };

  if (!nome?.trim() || !email?.trim() || !assunto?.trim() || !mensagem?.trim()) {
    return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Grava com a service role: quem manda um chamado (logado ou não) não
  // tem — nem precisa ter — permissão de leitura na tabela, só o admin.
  // Fazer o insert como o próprio usuário exigiria devolver a linha pra
  // satisfazer o .select() do client, o que esbarra na RLS de leitura.
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }

  const { data: ticket, error } = await admin
    .from("tickets_suporte")
    .insert({
      profile_id: user?.id ?? null,
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone?.trim() || null,
      assunto: assunto.trim(),
      mensagem: mensagem.trim(),
    })
    .select("id")
    .single();

  if (error || !ticket) {
    return NextResponse.json(
      { erro: error?.message ?? "Não foi possível enviar seu pedido." },
      { status: 500 },
    );
  }

  if (resendConfigurado() && process.env.EMAIL_COPIA_REDE_IMPULSO) {
    try {
      await getResend()!.emails.send({
        from: EMAIL_REMETENTE,
        to: process.env.EMAIL_COPIA_REDE_IMPULSO,
        subject: `Novo chamado de suporte: ${assunto.trim()}`,
        html: `
          <p><strong>De:</strong> ${nome.trim()} (${email.trim()}${telefone ? ` · ${telefone.trim()}` : ""})</p>
          <p><strong>Assunto:</strong> ${assunto.trim()}</p>
          <p>${mensagem.trim().replace(/\n/g, "<br>")}</p>
          ${rodapeTransacionalHtml()}
        `,
      });
    } catch {
      // O chamado já está salvo no banco — a falha de e-mail só atrasa o
      // aviso, não impede o admin de ver no painel de suporte.
    }
  }

  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
