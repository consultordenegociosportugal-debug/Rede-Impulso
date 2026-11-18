import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { horariosDisponiveis } from "@/lib/disponibilidade";
import { avisarAgendamento } from "@/lib/avisar-agendamento";
import { paraE164 } from "@/lib/telefone";
import { hojeISO, diasEntre } from "@/lib/data";

type Modalidade = "presencial" | "video";

// Link público do corretor (src/app/agendar/[id]) — cliente agenda sem
// criar conta, só com nome e WhatsApp, igual pedido no feedback dos
// corretores testando o sistema ("o link do cliente é nome, whatsapp e
// escolha seu dia e horário"). Mesma lógica do caminho "cliente_avulso"
// de /api/visitas/agendar, mas via service role (não há sessão de
// usuário nenhuma aqui) e sem o corretor precisar estar logado —
// qualquer um com o link pode marcar, de propósito (é o "link público
// pra compartilhar", sem CAPTCHA ou outra barreira hoje).
export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ erro: "Serviço indisponível no momento." }, { status: 503 });
  }

  let corpo: {
    corretor_id?: string;
    nome?: string;
    telefone?: string;
    data?: string;
    horario?: string;
    observacoes?: string;
    modalidade?: Modalidade;
  };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }
  const { corretor_id: corretorId, nome, telefone, data, horario, observacoes, modalidade: modalidadePedida } =
    corpo;

  if (
    !corretorId ||
    !data ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
    !horario ||
    !/^\d{2}:\d{2}$/.test(horario)
  ) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  if (data < hojeISO()) {
    return NextResponse.json(
      { erro: "Não é possível agendar uma visita no passado." },
      { status: 400 },
    );
  }

  // Sem isto, nada impedia marcar uma visita pro ano 9999 — sem CAPTCHA
  // nem rate limit neste link público (de propósito, ver comentário
  // acima), isso virava um jeito fácil de lotar a agenda de um corretor
  // com reservas falsas em qualquer data futura. 90 dias é generoso pra
  // uma visita de imóvel real.
  if (diasEntre(hojeISO(), data) > 90) {
    return NextResponse.json(
      { erro: "Só é possível agendar com até 90 dias de antecedência." },
      { status: 400 },
    );
  }

  const modalidade: Modalidade =
    modalidadePedida === "video" && diasEntre(hojeISO(), data) > 1 ? "video" : "presencial";

  const nomeLimpo = nome?.trim().slice(0, 120);
  if (!nomeLimpo) {
    return NextResponse.json({ erro: "Informe seu nome." }, { status: 400 });
  }

  const telefoneE164 = telefone?.trim() ? paraE164(telefone.trim()) : null;
  if (!telefoneE164) {
    return NextResponse.json({ erro: "Informe um WhatsApp válido, com DDD." }, { status: 400 });
  }

  const { data: corretorPerfil } = await admin
    .from("corretor_perfis")
    .select("profile_id")
    .eq("profile_id", corretorId)
    .maybeSingle();
  if (!corretorPerfil) {
    return NextResponse.json({ erro: "Corretor não encontrado." }, { status: 404 });
  }

  const { configurado, horarios } = await horariosDisponiveis(admin, corretorId, data);
  if (!configurado || !horarios.includes(horario)) {
    return NextResponse.json(
      { erro: "Esse horário não está mais disponível. Escolha outro." },
      { status: 409 },
    );
  }

  // Mesma pessoa marcando de novo pelo link público — reaproveita o
  // cadastro em "Meus clientes" do corretor em vez de duplicar.
  const { data: candidatos } = await admin
    .from("clientes_avulsos")
    .select("id, telefone")
    .eq("corretor_id", corretorId)
    .not("telefone", "is", null);
  const clienteExistenteId =
    candidatos?.find((c) => paraE164(c.telefone!) === telefoneE164)?.id ?? null;

  let clienteAvulsoId: string;
  if (clienteExistenteId) {
    await admin.from("clientes_avulsos").update({ nome: nomeLimpo }).eq("id", clienteExistenteId);
    clienteAvulsoId = clienteExistenteId;
  } else {
    const { data: novoCliente, error: erroCliente } = await admin
      .from("clientes_avulsos")
      .insert({ corretor_id: corretorId, nome: nomeLimpo, telefone: telefone!.trim() })
      .select("id")
      .single();
    if (erroCliente || !novoCliente) {
      return NextResponse.json(
        { erro: erroCliente?.message ?? "Não foi possível cadastrar o agendamento." },
        { status: 500 },
      );
    }
    clienteAvulsoId = novoCliente.id;
  }

  const { data: visita, error } = await admin
    .from("visitas")
    .insert({
      corretor_id: corretorId,
      cliente_avulso_id: clienteAvulsoId,
      data_hora: `${data}T${horario}:00-03:00`,
      status: "confirmada",
      observacoes: observacoes?.trim().slice(0, 500) || null,
      modalidade,
    })
    .select("id, data_hora")
    .single();

  if (error?.code === "23505") {
    return NextResponse.json(
      { erro: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." },
      { status: 409 },
    );
  }

  if (error || !visita) {
    return NextResponse.json(
      { erro: error?.message ?? "Não foi possível agendar a visita." },
      { status: 500 },
    );
  }

  const { precisaAvisarClienteManualmente, endereco, latitude, longitude } = await avisarAgendamento(admin, {
    clienteNome: nomeLimpo,
    clienteEmail: null,
    clienteTelefone: telefone!.trim(),
    corretorId,
    dataHoraIso: visita.data_hora,
    modalidade,
  });

  return NextResponse.json({
    ok: true,
    visitaId: visita.id,
    dataHora: visita.data_hora,
    precisaAvisarClienteManualmente,
    endereco,
    latitude,
    longitude,
    modalidade,
  });
}
