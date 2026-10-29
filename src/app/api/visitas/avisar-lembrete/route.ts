import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { enviarLembreteWhatsapp } from "@/lib/whatsapp";

// Lembrete de horário — a funcionalidade mais básica de qualquer
// sistema de agendamento de verdade (AppBarber chama de "lembrete de
// horários"). Roda de hora em hora; manda o aviso pra quem a visita
// está a até 2h de distância e ainda não recebeu lembrete. Protegido
// por CRON_SECRET, mesmo padrão de /api/assinatura/avisar-renovacao.

function autorizado(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type VisitaLembrete = {
  id: string;
  data_hora: string;
  comprador: { nome: string; email: string | null; telefone: string | null } | null;
  cliente_avulso: { nome: string; email: string | null; telefone: string | null } | null;
  corretor: { nome: string; email: string | null; telefone: string | null } | null;
};

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY ausente." }, { status: 503 });
  }

  const agora = new Date();
  const limite = new Date(agora.getTime() + 2 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("visitas")
    .select(
      "id, data_hora, comprador:comprador_id(nome, email, telefone), cliente_avulso:cliente_avulso_id(nome, email, telefone), corretor:corretor_id(nome, email, telefone)",
    )
    .eq("status", "confirmada")
    .is("lembrete_enviado_em", null)
    .gte("data_hora", agora.toISOString())
    .lte("data_hora", limite.toISOString());

  const visitas = (data ?? []) as unknown as VisitaLembrete[];

  if (!resendConfigurado()) {
    return NextResponse.json({
      ok: true,
      aviso: "RESEND_API_KEY ausente — lembretes não enviados.",
      pendentes: visitas.length,
    });
  }

  const resend = getResend()!;
  let enviados = 0;
  let falhas = 0;

  for (const visita of visitas) {
    const quando = formatoDataHora.format(new Date(visita.data_hora));
    const hora = quando.split(", ")[1] ?? quando;
    // Cliente avulso (cadastrado pelo corretor, sem login) não tem conta
    // nem telefone obrigatório — só manda o que tiver cadastrado.
    const interessado = visita.comprador ?? visita.cliente_avulso;
    const nomeContraparte = (papel: "interessado" | "responsavel") =>
      papel === "interessado" ? visita.corretor?.nome ?? "o corretor" : interessado?.nome ?? "o cliente";

    const destinatarios = [
      interessado?.email
        ? {
            email: interessado.email,
            telefone: interessado.telefone,
            nome: interessado.nome,
            papel: "interessado" as const,
          }
        : null,
      visita.corretor?.email
        ? {
            email: visita.corretor.email,
            telefone: visita.corretor.telefone,
            nome: visita.corretor.nome,
            papel: "responsavel" as const,
          }
        : null,
    ].filter(Boolean) as {
      email: string;
      telefone: string | null;
      nome: string;
      papel: "interessado" | "responsavel";
    }[];

    let falhouAlguma = false;

    for (const dest of destinatarios) {
      try {
        const { error } = await resend.emails.send({
          from: EMAIL_REMETENTE,
          to: dest.email,
          subject: `Lembrete: visita hoje às ${hora}`,
          html: `
            <p>Olá, ${dest.nome}.</p>
            <p>${
              dest.papel === "interessado"
                ? `Sua visita com <strong>${nomeContraparte("interessado")}</strong> está confirmada para <strong>${quando}</strong>.`
                : `Você tem uma visita confirmada com <strong>${nomeContraparte("responsavel")}</strong> às <strong>${quando}</strong>.`
            }</p>
            ${rodapeTransacionalHtml()}
          `,
        });
        if (error) falhouAlguma = true;
      } catch {
        falhouAlguma = true;
      }

      if (dest.telefone) {
        await enviarLembreteWhatsapp({
          telefone: dest.telefone,
          nomeDestinatario: dest.nome,
          nomeContraparte: nomeContraparte(dest.papel),
          horaFormatada: hora,
        });
      }
    }

    if (falhouAlguma) {
      falhas += 1;
      continue;
    }

    await supabase
      .from("visitas")
      .update({ lembrete_enviado_em: new Date().toISOString() })
      .eq("id", visita.id);
    enviados += 1;
  }

  return NextResponse.json({ ok: true, lembretes_enviados: enviados, com_falha: falhas });
}
