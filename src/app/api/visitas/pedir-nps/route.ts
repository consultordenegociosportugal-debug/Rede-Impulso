import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { enviarPedidoAvaliacaoWhatsapp } from "@/lib/whatsapp";

// Pesquisa de satisfação (NPS) pós-visita — dispara depois que a visita
// já aconteceu, uma vez só por visita. Roda diariamente (plano Hobby da
// Vercel só permite cron diário — ver vercel.json); por isso olha uma
// janela de alguns dias pra trás, não só "ontem".
function autorizado(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

const JANELA_DIAS = 3;

type VisitaNps = {
  id: string;
  nps_token: string;
  corretor: { nome: string } | null;
  comprador: { nome: string; email: string | null; telefone: string | null } | null;
  cliente_avulso: { nome: string; email: string | null; telefone: string | null } | null;
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
  const inicioJanela = new Date(agora.getTime() - JANELA_DIAS * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("visitas")
    .select(
      "id, nps_token, corretor:corretor_id(nome), comprador:comprador_id(nome, email, telefone), cliente_avulso:cliente_avulso_id(nome, email, telefone)",
    )
    .in("status", ["confirmada", "realizada"])
    .is("nps_enviado_em", null)
    .lt("data_hora", agora.toISOString())
    .gte("data_hora", inicioJanela.toISOString());

  const visitas = (data ?? []) as unknown as VisitaNps[];

  if (!resendConfigurado()) {
    return NextResponse.json({
      ok: true,
      aviso: "RESEND_API_KEY ausente — pesquisas não enviadas.",
      pendentes: visitas.length,
    });
  }

  const resend = getResend()!;
  const origem = new URL(request.url).origin;
  let enviados = 0;
  let semContato = 0;

  for (const visita of visitas) {
    const destinatario = visita.comprador ?? visita.cliente_avulso;
    if (!destinatario?.email && !destinatario?.telefone) {
      semContato += 1;
      // Sem e-mail nem telefone não tem como enviar — marca como
      // "tentado" pra não ficar reprocessando a mesma visita todo dia.
      await supabase
        .from("visitas")
        .update({ nps_enviado_em: new Date().toISOString() })
        .eq("id", visita.id);
      continue;
    }

    const link = `${origem}/nps/${visita.nps_token}`;
    let emailOk = !destinatario.email;

    if (destinatario.email) {
      try {
        const { error } = await resend.emails.send({
          from: EMAIL_REMETENTE,
          to: destinatario.email,
          subject: `Como foi sua visita com ${visita.corretor?.nome ?? "o corretor"}?`,
          html: `
            <p>Olá, ${destinatario.nome}.</p>
            <p>Sua visita com <strong>${visita.corretor?.nome ?? "o corretor"}</strong> já aconteceu.
            Pode avaliar o atendimento? Leva menos de um minuto.</p>
            <p><a href="${link}">Avaliar atendimento →</a></p>
            ${rodapeTransacionalHtml()}
          `,
        });
        emailOk = !error;
      } catch {
        emailOk = false;
      }
    }

    if (destinatario.telefone) {
      await enviarPedidoAvaliacaoWhatsapp({
        telefone: destinatario.telefone,
        nomeDestinatario: destinatario.nome,
        nomeCorretor: visita.corretor?.nome ?? "o corretor",
        link,
      });
    }

    if (!emailOk) continue;

    await supabase
      .from("visitas")
      .update({ nps_enviado_em: new Date().toISOString() })
      .eq("id", visita.id);
    enviados += 1;
  }

  return NextResponse.json({ ok: true, enviados, sem_contato: semContato });
}
