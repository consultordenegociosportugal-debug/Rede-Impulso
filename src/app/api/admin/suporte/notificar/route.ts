import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { escaparHtml } from "@/lib/escapar-html";

// Dispara o e-mail de resposta pro usuário depois que o admin respondeu o
// chamado (o update em si já rolou direto do client via RLS — essa rota
// só existe porque enviar e-mail precisa da chave do Resend, que não pode
// ir pro navegador). Confia na RLS de tickets_suporte pra garantir que só
// um chamado já respondido por um admin de verdade chega até aqui.
export async function POST(request: NextRequest) {
  const { ticketId } = (await request.json()) as { ticketId?: string };
  if (!ticketId) {
    return NextResponse.json({ erro: "ticketId é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: ticket } = await supabase
    .from("tickets_suporte")
    .select("nome, email, assunto, resposta, status")
    .eq("id", ticketId)
    .single();

  if (!ticket || ticket.status !== "respondido" || !ticket.resposta) {
    return NextResponse.json({ erro: "Chamado não encontrado ou sem resposta." }, { status: 404 });
  }

  if (!resendConfigurado()) {
    return NextResponse.json({ ok: true, aviso: "E-mail não configurado." });
  }

  try {
    await getResend()!.emails.send({
      from: EMAIL_REMETENTE,
      to: ticket.email,
      subject: `Resposta ao seu chamado: ${ticket.assunto}`,
      html: `
        <p>Olá, ${escaparHtml(ticket.nome)}.</p>
        <p>Sobre o chamado que você abriu (<strong>${escaparHtml(ticket.assunto)}</strong>):</p>
        <p>${escaparHtml(ticket.resposta).replace(/\n/g, "<br>")}</p>
        ${rodapeTransacionalHtml()}
      `,
    });
  } catch {
    return NextResponse.json({ erro: "Resposta salva, mas o e-mail falhou." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
