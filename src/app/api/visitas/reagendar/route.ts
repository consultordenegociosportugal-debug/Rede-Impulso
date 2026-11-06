import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { horariosDisponiveis } from "@/lib/disponibilidade";
import { avisarAgendamento } from "@/lib/avisar-agendamento";

type VisitaCancelada = {
  id: string;
  corretor_id: string;
  status: string;
  comprador_id: string | null;
  cliente_avulso_id: string | null;
  observacoes: string | null;
  comprador: { nome: string; email: string | null; telefone: string | null } | null;
  cliente_avulso: { nome: string; email: string | null; telefone: string | null } | null;
};

// Reagenda uma visita cancelada com o MESMO cliente, num horário novo —
// sem isso, o corretor tinha que abrir "Meus clientes" e recadastrar o
// cliente do zero só pra marcar outro horário (cliente_avulso) ou não
// tinha jeito nenhum de remarcar por quem já tinha conta (comprador),
// já que só o próprio cliente logado pode usar /api/visitas/agendar.
// Cria uma visita NOVA (preserva o histórico da cancelada) com o mesmo
// comprador_id/cliente_avulso_id de antes.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { visita_id: visitaId, data, horario } = (await request.json()) as {
    visita_id?: string;
    data?: string;
    horario?: string;
  };

  if (!visitaId || !data || !horario || !/^\d{2}:\d{2}$/.test(horario)) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const { data: visitaData, error: erroBusca } = await supabase
    .from("visitas")
    .select(
      "id, corretor_id, status, comprador_id, cliente_avulso_id, observacoes, comprador:comprador_id(nome, email, telefone), cliente_avulso:cliente_avulso_id(nome, email, telefone)",
    )
    .eq("id", visitaId)
    .single();

  const visita = visitaData as unknown as VisitaCancelada | null;

  // A RLS já garante que só o próprio corretor edita a visita — esse
  // erro cobre o caso de id inexistente ou de outro corretor.
  if (erroBusca || !visita || visita.corretor_id !== user.id) {
    return NextResponse.json({ erro: "Visita não encontrada." }, { status: 404 });
  }

  if (visita.status !== "cancelada") {
    return NextResponse.json({ erro: "Só dá para reagendar uma visita cancelada." }, { status: 409 });
  }

  const { configurado, horarios } = await horariosDisponiveis(supabase, visita.corretor_id, data);

  if (!configurado || !horarios.includes(horario)) {
    return NextResponse.json(
      { erro: "Esse horário não está mais disponível. Escolha outro." },
      { status: 409 },
    );
  }

  const { data: novaVisita, error } = await supabase
    .from("visitas")
    .insert({
      corretor_id: visita.corretor_id,
      comprador_id: visita.comprador_id,
      cliente_avulso_id: visita.cliente_avulso_id,
      data_hora: `${data}T${horario}:00-03:00`,
      status: "confirmada",
      observacoes: visita.observacoes,
    })
    .select("id, data_hora")
    .single();

  if (error?.code === "23505") {
    return NextResponse.json(
      { erro: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." },
      { status: 409 },
    );
  }

  if (error || !novaVisita) {
    return NextResponse.json(
      { erro: error?.message ?? "Não foi possível reagendar a visita." },
      { status: 500 },
    );
  }

  const interessado = visita.comprador ?? visita.cliente_avulso;
  let precisaAvisarClienteManualmente = false;
  if (interessado) {
    ({ precisaAvisarClienteManualmente } = await avisarAgendamento(supabase, {
      clienteNome: interessado.nome,
      clienteEmail: interessado.email,
      clienteTelefone: interessado.telefone,
      corretorId: visita.corretor_id,
      dataHoraIso: novaVisita.data_hora,
    }));
  }

  return NextResponse.json({
    ok: true,
    visitaId: novaVisita.id,
    dataHora: novaVisita.data_hora,
    precisaAvisarClienteManualmente,
  });
}
