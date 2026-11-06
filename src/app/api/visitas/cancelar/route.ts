import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { enviarCancelamentoWhatsapp } from "@/lib/whatsapp";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "America/Sao_Paulo",
});
const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type VisitaCancelamento = {
  id: string;
  corretor_id: string;
  status: string;
  data_hora: string;
  comprador: { nome: string; email: string | null; telefone: string | null } | null;
  cliente_avulso: { nome: string; email: string | null; telefone: string | null } | null;
  corretor: { nome: string; email: string | null; telefone: string | null } | null;
};

// Cancela uma visita e avisa quem não cancelou (hoje só o corretor tem
// esse botão — o cliente ainda não tem como cancelar pelo app). Sem essa
// rota, o cancelamento era um update direto do navegador, sem nenhum
// aviso pra ninguém.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { visita_id: visitaId } = (await request.json()) as { visita_id?: string };
  if (!visitaId) {
    return NextResponse.json({ erro: "visita_id é obrigatório." }, { status: 400 });
  }

  const { data: visitaData, error: erroBusca } = await supabase
    .from("visitas")
    .select(
      "id, corretor_id, status, data_hora, comprador:comprador_id(nome, email, telefone), cliente_avulso:cliente_avulso_id(nome, email, telefone), corretor:corretor_id(nome, email, telefone)",
    )
    .eq("id", visitaId)
    .single();

  const visita = visitaData as unknown as VisitaCancelamento | null;

  // A RLS já garante que só o próprio corretor edita a visita — esse
  // erro cobre o caso de id inexistente ou de outro corretor.
  if (erroBusca || !visita || visita.corretor_id !== user.id) {
    return NextResponse.json({ erro: "Visita não encontrada." }, { status: 404 });
  }

  if (visita.status === "cancelada") {
    return NextResponse.json({ ok: true, jaCancelada: true });
  }

  const { error: erroUpdate } = await supabase
    .from("visitas")
    .update({ status: "cancelada" })
    .eq("id", visitaId);

  if (erroUpdate) {
    return NextResponse.json({ erro: erroUpdate.message }, { status: 500 });
  }

  // Dali pra baixo nada pode derrubar a resposta — a visita já está
  // cancelada no banco antes de qualquer tentativa de aviso.
  const interessado = visita.comprador ?? visita.cliente_avulso;
  const quandoIso = new Date(visita.data_hora);
  const dataFormatada = formatoData.format(quandoIso);
  const horaFormatada = formatoHora.format(quandoIso);

  if (interessado?.email && resendConfigurado()) {
    try {
      await getResend()!.emails.send({
        from: EMAIL_REMETENTE,
        to: interessado.email,
        subject: `Visita com ${visita.corretor?.nome ?? "o corretor"} cancelada`,
        html: `
          <p>Olá, ${interessado.nome}.</p>
          <p>Sua visita com <strong>${visita.corretor?.nome ?? "o corretor"}</strong>, marcada para
          <strong>${dataFormatada} às ${horaFormatada}</strong>, foi cancelada.</p>
          ${rodapeTransacionalHtml()}
        `,
      });
    } catch {
      // Best-effort — a visita já está cancelada no banco.
    }
  }

  let precisaAvisarClienteManualmente = false;
  if (interessado?.telefone) {
    const enviado = await enviarCancelamentoWhatsapp({
      telefone: interessado.telefone,
      nomeDestinatario: interessado.nome,
      nomeContraparte: visita.corretor?.nome ?? "o corretor",
      dataFormatada,
      horaFormatada,
    });
    precisaAvisarClienteManualmente = !enviado;
  }

  return NextResponse.json({ ok: true, precisaAvisarClienteManualmente });
}
