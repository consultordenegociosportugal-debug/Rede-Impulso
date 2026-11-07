import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { horariosDisponiveis } from "@/lib/disponibilidade";
import { avisarAgendamento } from "@/lib/avisar-agendamento";
import { paraE164 } from "@/lib/telefone";
import { hojeISO } from "@/lib/data";

// Agenda uma visita num horário realmente livre — nasce `confirmada`
// direto, sem precisar de confirmação manual depois (esse é o ganho de
// ter disponibilidade real, em vez de só pedir um horário qualquer).
// Recalcula a disponibilidade aqui dentro em vez de confiar no que o
// front mandou — fecha a corrida em que duas pessoas pedem o mesmo
// horário quase ao mesmo tempo.
//
// Dois formatos de corpo, conforme quem está agendando:
//   1. { corretor_id, data, horario } — cliente logado agenda direto
//      com um corretor.
//   2. { corretor_id, data, horario, cliente_avulso: { nome, telefone } }
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
    corretor_id: corretorId,
    cliente_avulso: clienteAvulso,
    data,
    horario,
    observacoes,
  } = (await request.json()) as {
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

  if (
    !corretorId ||
    !data ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
    !horario ||
    !/^\d{2}:\d{2}$/.test(horario)
  ) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  // horariosDisponiveis só filtra horário já passado para o dia de HOJE
  // — sem esta checagem, nada impedia um POST direto (fora da tela, que
  // só deixa escolher data >= hoje) de "agendar" num dia já passado.
  if (data < hojeISO()) {
    return NextResponse.json(
      { erro: "Não é possível agendar uma visita no passado." },
      { status: 400 },
    );
  }

  if (clienteAvulso && corretorId !== user.id) {
    return NextResponse.json(
      { erro: "Só o próprio corretor pode cadastrar um cliente e agendar por ele." },
      { status: 403 },
    );
  }

  // O corretor pode abrir o próprio perfil público (é o link que ele
  // compartilha com os clientes) e, sem esta checagem, o botão
  // "Agendar" de lá deixava ele marcar uma visita consigo mesmo
  // (corretor_id === comprador_id) — visita sem sentido nenhum que
  // ainda assim entrava nas estatísticas do dashboard e mandava
  // e-mail/WhatsApp de confirmação pra própria pessoa.
  if (!clienteAvulso && corretorId === user.id) {
    return NextResponse.json(
      { erro: "Você não pode agendar uma visita consigo mesmo." },
      { status: 400 },
    );
  }

  // corretorId === user.id já garante que é o próprio usuário, mas não
  // que esse usuário É corretor — sem isto, qualquer comprador logado
  // conseguia se auto-agendar como cliente avulso de si mesmo (o RLS
  // da migração 0065 bloqueia o insert, mas devolveria um erro de banco
  // genérico em vez desta mensagem).
  if (clienteAvulso) {
    const { data: corretorPerfil } = await supabase
      .from("corretor_perfis")
      .select("profile_id")
      .eq("profile_id", corretorId)
      .maybeSingle();
    if (!corretorPerfil) {
      return NextResponse.json(
        { erro: "Você ainda não está cadastrado como corretor na Rede Impulso." },
        { status: 403 },
      );
    }
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
  let compradorExistenteId: string | null = null;
  // Contato usado no aviso de confirmação — começa com o que o corretor
  // digitou, mas vira o da CONTA se achar uma (mais confiável que o que
  // foi digitado de memória, e é a mesma pessoa de qualquer forma).
  let contatoAviso = {
    nome: clienteAvulso?.nome?.trim() ?? "",
    email: clienteAvulso?.email?.trim() || null,
    telefone: clienteAvulso?.telefone?.trim() || null,
  };
  let vinculadoAContaExistente = false;

  if (clienteAvulso) {
    const nome = clienteAvulso.nome?.trim();
    if (!nome) {
      return NextResponse.json({ erro: "Nome do cliente é obrigatório." }, { status: 400 });
    }

    // Sem isto, um cliente que o corretor cadastra de memória mas que JÁ
    // tem conta própria virava um registro duplicado — a visita nunca
    // aparecia em "Meus agendamentos" daquela pessoa. Comparação exata
    // por telefone normalizado (ver migração 0070): não pega contas com
    // telefone salvo num formato antigo, mas isso é só "não encontrou",
    // nunca um falso positivo.
    const telefoneNormalizado = clienteAvulso.telefone?.trim()
      ? paraE164(clienteAvulso.telefone.trim())
      : null;
    if (telefoneNormalizado) {
      const { data: existente } = (await supabase
        .rpc("buscar_comprador_por_telefone_e164", { p_telefone: telefoneNormalizado })
        .maybeSingle()) as unknown as {
        data: { id: string; nome: string; email: string | null; telefone: string | null } | null;
      };
      if (existente) {
        compradorExistenteId = existente.id;
        contatoAviso = { nome: existente.nome, email: existente.email, telefone: existente.telefone };
        vinculadoAContaExistente = true;
      }
    }

    if (!compradorExistenteId) {
      // Mesmo corretor cadastrando o mesmo telefone de novo (pra marcar
      // outra visita, por exemplo) — reaproveita o cadastro em vez de
      // duplicar a linha em "Meus clientes", e atualiza com o que veio
      // de novo no formulário.
      let clienteExistenteId: string | null = null;
      if (telefoneNormalizado) {
        // clientes_avulsos.telefone é salvo no formato "bonito" que a
        // pessoa digitou (com +55, parênteses etc.), não em E.164 — um
        // .eq() direto contra telefoneNormalizado nunca batia, e todo
        // reagendamento pro mesmo cliente duplicava a linha em "Meus
        // clientes". Compara só os dígitos dos dois lados.
        const { data: candidatos } = await supabase
          .from("clientes_avulsos")
          .select("id, telefone")
          .eq("corretor_id", user.id)
          .not("telefone", "is", null);
        clienteExistenteId =
          candidatos?.find((c) => paraE164(c.telefone!) === telefoneNormalizado)?.id ?? null;
      }

      if (clienteExistenteId) {
        await supabase
          .from("clientes_avulsos")
          .update({
            nome,
            email: clienteAvulso.email?.trim() || null,
            cidade: clienteAvulso.cidade?.trim() || null,
            imovel_interesse: clienteAvulso.imovel_interesse?.trim() || null,
          })
          .eq("id", clienteExistenteId);
        clienteAvulsoId = clienteExistenteId;
      } else {
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
    }
  }

  // Horário de Brasília explícito — sem isso, o Postgres grava o
  // horário "nu" como se já fosse UTC (3h adiantado do que o corretor
  // configurou). Ver nota de fuso em src/lib/disponibilidade.ts.
  const { data: visita, error } = await supabase
    .from("visitas")
    .insert({
      corretor_id: corretorId,
      comprador_id: clienteAvulso ? compradorExistenteId : user.id,
      cliente_avulso_id: clienteAvulsoId,
      data_hora: `${data}T${horario}:00-03:00`,
      status: "confirmada",
      observacoes: observacoes?.trim() || null,
    })
    .select("id, data_hora")
    .single();

  if (error?.code === "23505") {
    // Corrida: outra pessoa confirmou esse exato horário entre a
    // checagem de disponibilidade acima e este insert.
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

  let precisaAvisarClienteManualmente = false;
  if (clienteAvulso) {
    ({ precisaAvisarClienteManualmente } = await avisarAgendamento(supabase, {
      clienteNome: contatoAviso.nome || clienteAvulso.nome!.trim(),
      clienteEmail: contatoAviso.email,
      clienteTelefone: contatoAviso.telefone,
      corretorId: corretorId as string,
      dataHoraIso: visita.data_hora,
    }));
  } else {
    const { data: comprador } = await supabase
      .from("profiles")
      .select("nome, email, telefone")
      .eq("id", user.id)
      .single();
    ({ precisaAvisarClienteManualmente } = await avisarAgendamento(supabase, {
      clienteNome: comprador?.nome ?? "Cliente",
      clienteEmail: comprador?.email ?? user.email ?? null,
      clienteTelefone: comprador?.telefone ?? null,
      corretorId: corretorId as string,
      dataHoraIso: visita.data_hora,
    }));
  }

  return NextResponse.json({
    ok: true,
    visitaId: visita.id,
    dataHora: visita.data_hora,
    precisaAvisarClienteManualmente,
    vinculadoAContaExistente,
  });
}
