import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { horariosDisponiveis } from "@/lib/disponibilidade";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { enviarConfirmacaoWhatsapp } from "@/lib/whatsapp";

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "America/Sao_Paulo",
});
const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

// Aviso de agendamento — roda pros dois jeitos de agendar (cliente logado
// agenda sozinho, ou corretor cadastra um cliente avulso e agenda por
// ele). Manda e-mail (cliente + cópia pro corretor, pra Rede Impulso e,
// se o corretor estiver vinculado a uma imobiliária/construtora do
// catálogo, pro gestor dela) e WhatsApp (cliente e corretor, cada um com
// seu próprio número) — os dois lados da visita ficam sabendo.
async function avisarAgendamento(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dados: {
    clienteNome: string;
    clienteEmail: string | null;
    clienteTelefone: string | null;
    corretorId: string;
    dataHoraIso: string;
  },
) {
  const [{ data: corretor }, { data: corretorPerfil }] = await Promise.all([
    supabase.from("profiles").select("nome, email, telefone").eq("id", dados.corretorId).single(),
    supabase
      .from("corretor_perfis")
      .select("organizacao:organizacao_catalogo_id(nome, email_gestor)")
      .eq("profile_id", dados.corretorId)
      .single(),
  ]);

  const organizacao = (
    corretorPerfil as unknown as {
      organizacao: { nome: string; email_gestor: string | null } | null;
    } | null
  )?.organizacao;

  const quandoIso = new Date(dados.dataHoraIso);
  const dataFormatada = formatoData.format(quandoIso);
  const horaFormatada = formatoHora.format(quandoIso);

  if (resendConfigurado()) {
    const copias = [
      corretor?.email,
      process.env.EMAIL_COPIA_REDE_IMPULSO,
      organizacao?.email_gestor,
    ].filter((e): e is string => Boolean(e));

    if (dados.clienteEmail || copias.length > 0) {
      const quando = formatoDataHora.format(quandoIso);
      const resend = getResend()!;
      try {
        await resend.emails.send({
          from: EMAIL_REMETENTE,
          to: dados.clienteEmail || copias[0],
          cc: dados.clienteEmail ? copias : copias.slice(1),
          subject: `Agendamento confirmado com ${corretor?.nome ?? "seu corretor"}`,
          html: `
            <p>Olá, ${dados.clienteNome}.</p>
            <p>Seu agendamento com <strong>${corretor?.nome ?? "o corretor"}</strong>${
              organizacao ? ` (${organizacao.nome})` : ""
            } está confirmado para <strong>${quando}</strong>.</p>
            ${rodapeTransacionalHtml()}
          `,
        });
      } catch {
        // Mesmo padrão do resto do app: falha de e-mail não derruba o
        // agendamento, que já está confirmado no banco.
      }
    }
  }

  const avisos: Promise<void>[] = [];
  if (dados.clienteTelefone) {
    avisos.push(
      enviarConfirmacaoWhatsapp({
        telefone: dados.clienteTelefone,
        nomeDestinatario: dados.clienteNome,
        nomeContraparte: corretor?.nome ?? "o corretor",
        dataFormatada,
        horaFormatada,
      }),
    );
  }
  if (corretor?.telefone) {
    avisos.push(
      enviarConfirmacaoWhatsapp({
        telefone: corretor.telefone,
        nomeDestinatario: corretor.nome ?? "Corretor",
        nomeContraparte: dados.clienteNome,
        dataFormatada,
        horaFormatada,
      }),
    );
  }
  await Promise.all(avisos);
}

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

  if (!corretorId || !data || !horario || !/^\d{2}:\d{2}$/.test(horario)) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
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

  if (clienteAvulso) {
    await avisarAgendamento(supabase, {
      clienteNome: clienteAvulso.nome!.trim(),
      clienteEmail: clienteAvulso.email?.trim() || null,
      clienteTelefone: clienteAvulso.telefone?.trim() || null,
      corretorId: corretorId as string,
      dataHoraIso: visita.data_hora,
    });
  } else {
    const { data: comprador } = await supabase
      .from("profiles")
      .select("nome, email, telefone")
      .eq("id", user.id)
      .single();
    await avisarAgendamento(supabase, {
      clienteNome: comprador?.nome ?? "Cliente",
      clienteEmail: comprador?.email ?? user.email ?? null,
      clienteTelefone: comprador?.telefone ?? null,
      corretorId: corretorId as string,
      dataHoraIso: visita.data_hora,
    });
  }

  return NextResponse.json({ ok: true, visitaId: visita.id, dataHora: visita.data_hora });
}
