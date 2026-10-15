import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { horariosDisponiveis } from "@/lib/disponibilidade";

// Agenda uma visita num horário realmente livre — nasce `confirmada`
// direto, sem o corretor precisar confirmar manualmente depois (esse
// é o ganho de ter disponibilidade real, em vez de só pedir um
// horário qualquer). Recalcula a disponibilidade aqui dentro em vez
// de confiar no que o front mandou — fecha a corrida em que dois
// interessados pedem o mesmo horário quase ao mesmo tempo.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { imovel_id: imovelId, data, horario, observacoes } = (await request.json()) as {
    imovel_id?: string;
    data?: string;
    horario?: string;
    observacoes?: string;
  };

  if (!imovelId || !data || !horario || !/^\d{2}:\d{2}$/.test(horario)) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const { data: corretorId, error: erroRpc } = await supabase.rpc(
    "corretor_responsavel_imovel",
    { p_imovel_id: imovelId },
  );

  if (erroRpc || !corretorId) {
    return NextResponse.json({ erro: "Imóvel não encontrado." }, { status: 404 });
  }

  const { configurado, horarios } = await horariosDisponiveis(supabase, corretorId, data);

  if (!configurado || !horarios.includes(horario)) {
    return NextResponse.json(
      { erro: "Esse horário não está mais disponível. Escolha outro." },
      { status: 409 },
    );
  }

  const { data: visita, error } = await supabase
    .from("visitas")
    .insert({
      imovel_id: imovelId,
      comprador_id: user.id,
      data_hora: `${data}T${horario}:00`,
      status: "confirmada",
      observacoes: observacoes?.trim() || null,
    })
    .select("id, data_hora")
    .single();

  if (error || !visita) {
    return NextResponse.json(
      { erro: error?.message ?? "Não foi possível agendar a visita." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, visitaId: visita.id, dataHora: visita.data_hora });
}
