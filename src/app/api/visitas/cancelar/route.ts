import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { avisarCancelamento } from "@/lib/avisar-cancelamento";

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

  const { error: erroUpdate } = await supabase.rpc("atualizar_status_visita_com_motivo", {
    p_visita_id: visitaId,
    p_status: "cancelada",
    p_motivo: "Cancelada pelo corretor",
  });

  if (erroUpdate) {
    return NextResponse.json({ erro: erroUpdate.message }, { status: 500 });
  }

  // Dali pra baixo nada pode derrubar a resposta — a visita já está
  // cancelada no banco antes de qualquer tentativa de aviso.
  const interessado = visita.comprador ?? visita.cliente_avulso;
  let precisaAvisarClienteManualmente = false;
  if (interessado) {
    ({ precisaAvisarManualmente: precisaAvisarClienteManualmente } = await avisarCancelamento({
      destinatarioNome: interessado.nome,
      destinatarioEmail: interessado.email,
      destinatarioTelefone: interessado.telefone,
      nomeContraparte: visita.corretor?.nome ?? "o corretor",
      dataHoraIso: visita.data_hora,
    }));
  }

  return NextResponse.json({ ok: true, precisaAvisarClienteManualmente });
}
