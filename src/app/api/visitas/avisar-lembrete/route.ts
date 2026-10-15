import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";

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
  imoveis: { titulo: string; bairro: string; cidade: string } | null;
  comprador: { nome: string; email: string | null } | null;
  corretor: { nome: string; email: string | null } | null;
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
      "id, data_hora, imoveis(titulo, bairro, cidade), comprador:comprador_id(nome, email), corretor:corretor_id(nome, email)",
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
    const imovel = visita.imoveis;
    const local = imovel ? `${imovel.titulo} — ${imovel.bairro}, ${imovel.cidade}` : "o imóvel";

    const destinatarios = [
      visita.comprador?.email
        ? { email: visita.comprador.email, nome: visita.comprador.nome, papel: "interessado" as const }
        : null,
      visita.corretor?.email
        ? { email: visita.corretor.email, nome: visita.corretor.nome, papel: "responsavel" as const }
        : null,
    ].filter(Boolean) as { email: string; nome: string; papel: "interessado" | "responsavel" }[];

    let falhouAlguma = false;

    for (const dest of destinatarios) {
      try {
        const { error } = await resend.emails.send({
          from: EMAIL_REMETENTE,
          to: dest.email,
          subject: `Lembrete: visita hoje às ${quando.split(", ")[1] ?? quando}`,
          html: `
            <p>Olá, ${dest.nome}.</p>
            <p>${
              dest.papel === "interessado"
                ? `Sua visita a <strong>${local}</strong> está confirmada para <strong>${quando}</strong>.`
                : `Você tem uma visita confirmada em <strong>${local}</strong> às <strong>${quando}</strong>.`
            }</p>
            ${rodapeTransacionalHtml()}
          `,
        });
        if (error) falhouAlguma = true;
      } catch {
        falhouAlguma = true;
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
