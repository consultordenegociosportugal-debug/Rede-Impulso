import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarCancelamento } from "@/lib/avisar-cancelamento";
import {
  lerConfig,
  tokenExpirado,
  renovarAccessToken,
  calcularExpiracao,
  apagarEvento,
} from "@/lib/google-calendar";

type VisitaCancelamento = {
  id: string;
  corretor_id: string;
  comprador_id: string | null;
  status: string;
  data_hora: string;
  google_event_id: string | null;
  comprador: { nome: string; email: string | null; telefone: string | null } | null;
  cliente_avulso: { nome: string; email: string | null; telefone: string | null } | null;
  corretor: { nome: string; email: string | null; telefone: string | null } | null;
};

// Tira o evento da Google Agenda do CORRETOR, não importa quem cancelou
// a visita. Antes, isso só acontecia quando o próprio corretor cancelava
// (o botão dele chamava /api/google-calendar/sync depois, usando a
// própria sessão) — quando o cliente cancela, não tem sessão de corretor
// nenhuma pra fazer essa chamada, e a RLS de google_calendar_conexoes
// não deixaria o cliente ler o token do corretor mesmo que tentasse.
// Por isso aqui usa o admin client — é um job de servidor, não uma ação
// de usuário comum.
async function removerEventoDoCorretor(visita: VisitaCancelamento) {
  if (!visita.google_event_id) return;

  const admin = createAdminClient();
  const config = lerConfig();
  if (!admin || !config) return;

  try {
    const { data: conexao } = await admin
      .from("google_calendar_conexoes")
      .select("refresh_token, access_token, expira_em, calendar_id")
      .eq("profile_id", visita.corretor_id)
      .maybeSingle();

    if (!conexao) return;

    let accessToken = conexao.access_token as string | null;

    if (tokenExpirado(conexao.expira_em as string | null)) {
      const refreshToken = conexao.refresh_token as string | null;
      const renovado = refreshToken ? await renovarAccessToken(config, refreshToken) : null;
      accessToken = renovado?.access_token ?? null;
      if (accessToken) {
        await admin
          .from("google_calendar_conexoes")
          .update({
            access_token: accessToken,
            expira_em: calcularExpiracao(renovado!.expires_in),
          })
          .eq("profile_id", visita.corretor_id);
      }
    }

    if (!accessToken) return;

    const calendarId = (conexao.calendar_id as string | null) ?? "primary";
    const apagou = await apagarEvento(accessToken, calendarId, visita.google_event_id);
    if (apagou) {
      await admin.from("visitas").update({ google_event_id: null }).eq("id", visita.id);
    }
  } catch {
    // Best-effort — a visita já está cancelada no banco, isso não pode
    // derrubar a resposta.
  }
}

// Cancela uma visita e avisa quem não cancelou — tanto o corretor
// (avisa o cliente) quanto o próprio cliente logado (avisa o corretor)
// podem chamar essa rota; a migração 0080 deu ao comprador permissão de
// RLS pra mudar o status da própria visita pra "cancelada", então o que
// decide quem é "quem cancelou" aqui é só de quem é o id da sessão.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { visita_id: visitaId, motivo } = (await request.json()) as {
    visita_id?: string;
    motivo?: string;
  };
  if (!visitaId) {
    return NextResponse.json({ erro: "visita_id é obrigatório." }, { status: 400 });
  }

  const { data: visitaData, error: erroBusca } = await supabase
    .from("visitas")
    .select(
      "id, corretor_id, comprador_id, status, data_hora, google_event_id, comprador:comprador_id(nome, email, telefone), cliente_avulso:cliente_avulso_id(nome, email, telefone), corretor:corretor_id(nome, email, telefone)",
    )
    .eq("id", visitaId)
    .single();

  const visita = visitaData as unknown as VisitaCancelamento | null;

  const souCorretor = visita?.corretor_id === user.id;
  const souComprador = Boolean(visita?.comprador_id) && visita?.comprador_id === user.id;

  // A RLS já garante que só o corretor ou o próprio cliente da visita
  // editam ela — esse erro cobre o caso de id inexistente ou de quem
  // não tem nada a ver com essa visita.
  if (erroBusca || !visita || (!souCorretor && !souComprador)) {
    return NextResponse.json({ erro: "Visita não encontrada." }, { status: 404 });
  }

  if (visita.status === "cancelada") {
    return NextResponse.json({ ok: true, jaCancelada: true });
  }

  const motivoFinal =
    motivo?.trim() ||
    (souComprador
      ? "Cancelada pelo cliente (sem motivo informado)"
      : "Cancelada pelo corretor (sem motivo informado)");

  const { error: erroUpdate } = await supabase.rpc("atualizar_status_visita_com_motivo", {
    p_visita_id: visitaId,
    p_status: "cancelada",
    p_motivo: motivoFinal,
  });

  if (erroUpdate) {
    return NextResponse.json({ erro: erroUpdate.message }, { status: 500 });
  }

  // Dali pra baixo nada pode derrubar a resposta — a visita já está
  // cancelada no banco antes de qualquer tentativa de aviso ou de
  // sincronizar a agenda. Quem cancelou não precisa ser avisado — só a
  // outra ponta.
  await removerEventoDoCorretor(visita);

  let precisaAvisarManualmente = false;
  if (souComprador) {
    if (visita.corretor) {
      const interessado = visita.comprador ?? visita.cliente_avulso;
      ({ precisaAvisarManualmente } = await avisarCancelamento({
        destinatarioNome: visita.corretor.nome,
        destinatarioEmail: visita.corretor.email,
        destinatarioTelefone: visita.corretor.telefone,
        nomeContraparte: interessado?.nome ?? "o cliente",
        dataHoraIso: visita.data_hora,
        motivoExtra: motivo?.trim() || undefined,
      }));
    }
  } else {
    const interessado = visita.comprador ?? visita.cliente_avulso;
    if (interessado) {
      ({ precisaAvisarManualmente } = await avisarCancelamento({
        destinatarioNome: interessado.nome,
        destinatarioEmail: interessado.email,
        destinatarioTelefone: interessado.telefone,
        nomeContraparte: visita.corretor?.nome ?? "o corretor",
        dataHoraIso: visita.data_hora,
        motivoExtra: motivo?.trim() || undefined,
      }));
    }
  }

  return NextResponse.json({ ok: true, precisaAvisarManualmente });
}
