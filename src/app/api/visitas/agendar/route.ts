import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { horariosDisponiveis } from "@/lib/disponibilidade";

// Agenda uma visita num horário realmente livre — nasce `confirmada`
// direto, sem precisar de confirmação manual depois (esse é o ganho de
// ter disponibilidade real, em vez de só pedir um horário qualquer).
// Recalcula a disponibilidade aqui dentro em vez de confiar no que o
// front mandou — fecha a corrida em que duas pessoas pedem o mesmo
// horário quase ao mesmo tempo.
//
// Três formatos de corpo, conforme quem está agendando:
//   1. { imovel_id, data, horario } — fluxo antigo, cliente agenda uma
//      visita a um imóvel específico; o corretor vem do imóvel.
//   2. { corretor_id, data, horario } — cliente logado agenda direto
//      com um corretor, sem imóvel.
//   3. { corretor_id, data, horario, cliente_avulso: { nome, telefone } }
//      — o CORRETOR logado cadastra um cliente de balcão (sem conta) e
//      já agenda para ele. Só o próprio corretor pode fazer isso.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const {
    imovel_id: imovelId,
    corretor_id: corretorIdBody,
    cliente_avulso: clienteAvulso,
    data,
    horario,
    observacoes,
  } = (await request.json()) as {
    imovel_id?: string;
    corretor_id?: string;
    cliente_avulso?: {
      nome?: string;
      telefone?: string;
      email?: string;
      cidade?: string;
      imovel_interesse?: string;
    };
    data?: string;
    horario?: string;
    observacoes?: string;
  };

  if ((!imovelId && !corretorIdBody) || !data || !horario || !/^\d{2}:\d{2}$/.test(horario)) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  let corretorId = corretorIdBody ?? null;
  if (!corretorId && imovelId) {
    const { data: resolvido, error: erroRpc } = await supabase.rpc(
      "corretor_responsavel_imovel",
      { p_imovel_id: imovelId },
    );
    if (erroRpc || !resolvido) {
      return NextResponse.json({ erro: "Imóvel não encontrado." }, { status: 404 });
    }
    corretorId = resolvido;
  }

  if (clienteAvulso && corretorId !== user.id) {
    return NextResponse.json(
      { erro: "Só o próprio corretor pode cadastrar um cliente e agendar por ele." },
      { status: 403 },
    );
  }

  const { configurado, horarios } = await horariosDisponiveis(
    supabase,
    corretorId as string,
    data,
  );

  if (!configurado || !horarios.includes(horario)) {
    return NextResponse.json(
      { erro: "Esse horário não está mais disponível. Escolha outro." },
      { status: 409 },
    );
  }

  let clienteAvulsoId: string | null = null;
  if (clienteAvulso) {
    const nome = clienteAvulso.nome?.trim();
    if (!nome) {
      return NextResponse.json({ erro: "Nome do cliente é obrigatório." }, { status: 400 });
    }
    const { data: novoCliente, error: erroCliente } = await supabase
      .from("clientes_avulsos")
      .insert({
        corretor_id: user.id,
        nome,
        telefone: clienteAvulso.telefone?.trim() || null,
        email: clienteAvulso.email?.trim() || null,
        cidade: clienteAvulso.cidade?.trim() || null,
        imovel_interesse: clienteAvulso.imovel_interesse?.trim() || null,
      })
      .select("id")
      .single();
    if (erroCliente || !novoCliente) {
      return NextResponse.json(
        { erro: erroCliente?.message ?? "Não foi possível cadastrar o cliente." },
        { status: 500 },
      );
    }
    clienteAvulsoId = novoCliente.id;
  }

  // Horário de Brasília explícito — sem isso, o Postgres grava o
  // horário "nu" como se já fosse UTC (3h adiantado do que o corretor
  // configurou). Ver nota de fuso em src/lib/disponibilidade.ts.
  const { data: visita, error } = await supabase
    .from("visitas")
    .insert({
      imovel_id: imovelId ?? null,
      corretor_id: corretorId,
      comprador_id: clienteAvulsoId ? null : user.id,
      cliente_avulso_id: clienteAvulsoId,
      data_hora: `${data}T${horario}:00-03:00`,
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
