import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  apagarEvento,
  calcularExpiracao,
  criarEvento,
  lerConfig,
  renovarAccessToken,
  tokenExpirado,
} from "@/lib/google-calendar";

// Sincroniza uma visita com o Google Agenda do responsável.
//
// Esta rota é SEMPRE best-effort: quem chama (o botão de
// confirmar/cancelar no painel) já gravou a mudança no Supabase antes
// e ignora o que voltar daqui. Por isso nada aqui devolve erro fatal
// para o fluxo — só um `sincronizado: false` com o motivo.

type VisitaSync = {
  id: string;
  corretor_id: string | null;
  data_hora: string;
  observacoes: string | null;
  google_event_id: string | null;
  imoveis: { titulo: string; bairro: string; cidade: string } | null;
  comprador: { nome: string; telefone: string | null; email: string | null } | null;
};

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export async function POST(request: NextRequest) {
  const config = lerConfig();
  if (!config) {
    return NextResponse.json(
      { erro: "Integração com Google Agenda não configurada." },
      { status: 503 },
    );
  }

  const { visita_id: visitaId, acao } = (await request.json()) as {
    visita_id?: string;
    acao?: "confirmar" | "cancelar";
  };

  if (!visitaId || (acao !== "confirmar" && acao !== "cancelar")) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data } = await supabase
    .from("visitas")
    .select(
      "id, corretor_id, data_hora, observacoes, google_event_id, imoveis(titulo, bairro, cidade), comprador:comprador_id(nome, telefone, email)",
    )
    .eq("id", visitaId)
    .maybeSingle();

  const visita = data as unknown as VisitaSync | null;

  // O RLS já limita o que essa pessoa enxerga; aqui reforça que só o
  // responsável pela visita mexe na agenda dela.
  if (!visita || visita.corretor_id !== user.id) {
    return NextResponse.json({ erro: "Visita não encontrada." }, { status: 404 });
  }

  const { data: conexao } = await supabase
    .from("google_calendar_conexoes")
    .select("refresh_token, access_token, expira_em, calendar_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!conexao) {
    return NextResponse.json({ sincronizado: false, motivo: "sem_conexao" });
  }

  let accessToken = conexao.access_token as string | null;

  if (tokenExpirado(conexao.expira_em as string | null)) {
    const refreshToken = conexao.refresh_token as string | null;
    if (!refreshToken) {
      return NextResponse.json({ sincronizado: false, motivo: "reconectar" });
    }

    const renovado = await renovarAccessToken(config, refreshToken);
    if (!renovado?.access_token) {
      return NextResponse.json({ sincronizado: false, motivo: "reconectar" });
    }

    accessToken = renovado.access_token;
    await supabase
      .from("google_calendar_conexoes")
      .update({
        access_token: renovado.access_token,
        expira_em: calcularExpiracao(renovado.expires_in),
      })
      .eq("profile_id", user.id);
  }

  if (!accessToken) {
    return NextResponse.json({ sincronizado: false, motivo: "reconectar" });
  }

  const calendarId = (conexao.calendar_id as string | null) ?? "primary";

  if (acao === "cancelar") {
    if (!visita.google_event_id) {
      return NextResponse.json({ sincronizado: true, motivo: "sem_evento" });
    }

    const apagou = await apagarEvento(accessToken, calendarId, visita.google_event_id);
    if (apagou) {
      await supabase
        .from("visitas")
        .update({ google_event_id: null })
        .eq("id", visita.id);
    }

    return NextResponse.json({ sincronizado: apagou });
  }

  // Confirmar: se já existe evento, não duplica.
  if (visita.google_event_id) {
    return NextResponse.json({ sincronizado: true, motivo: "ja_sincronizada" });
  }

  const imovel = visita.imoveis;
  const local = imovel ? `${imovel.bairro}, ${imovel.cidade}` : "";
  const contato = [visita.comprador?.telefone, visita.comprador?.email]
    .filter(Boolean)
    .join(" · ");

  const descricao = [
    `Visita agendada pela Rede Impulso em ${formatoDataHora.format(new Date(visita.data_hora))}.`,
    imovel ? `Imóvel: ${imovel.titulo} — ${local}` : null,
    visita.comprador?.nome ? `Interessado: ${visita.comprador.nome}` : null,
    contato ? `Contato: ${contato}` : null,
    visita.observacoes ? `Observações: ${visita.observacoes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const eventId = await criarEvento(accessToken, calendarId, {
    titulo: `Visita — ${imovel?.titulo ?? "Imóvel"}${local ? ` (${local})` : ""}`,
    descricao,
    inicio: new Date(visita.data_hora),
  });

  if (!eventId) {
    return NextResponse.json({ sincronizado: false, motivo: "falha_google" });
  }

  await supabase
    .from("visitas")
    .update({ google_event_id: eventId })
    .eq("id", visita.id);

  return NextResponse.json({ sincronizado: true });
}
