import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarTextoLivreWhatsapp, enviarMensagemClienteParaCorretorWhatsapp } from "@/lib/whatsapp";
import { enviarPushParaCorretor } from "@/lib/push";
import { paraE164, telefoneCanonico } from "@/lib/telefone";

// Até agora o app só sabia o que a Meta respondia na hora de mandar
// (POST /messages) — e essa resposta só confirma que a Meta ACEITOU a
// mensagem pra processar, nunca que ela chegou de verdade no celular.
// O status real (sent/delivered/read/failed, com o motivo da falha) só
// existe aqui, via webhook assíncrono. Investigado numa sessão de teste
// em que várias mensagens "aceitas" pela API nunca chegaram ao
// destinatário — sem isto, não tinha como saber por quê.

// Verificação do webhook: a Meta chama esse GET uma vez, na hora de
// configurar a URL no painel do app, pra confirmar que o dono do
// endpoint concorda em receber os eventos.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (modo === "subscribe" && challenge && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ erro: "Verificação falhou." }, { status: 403 });
}

type StatusEvento = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipient_id: string;
  errors?: { code: number; title: string; message?: string; error_data?: { details?: string } }[];
};

// Mascara o número nos logs — é PII de cliente, não precisa aparecer
// inteiro num log de produção pra ser útil na hora de depurar.
function mascarar(numero: string): string {
  if (numero.length <= 4) return "****";
  return `${"*".repeat(numero.length - 4)}${numero.slice(-4)}`;
}

type MensagemRecebida = {
  id: string;
  from: string;
  type: string;
  context?: { id?: string };
  button?: { text?: string; payload?: string };
  text?: { body?: string };
};

// Resposta ao botão "Confirmar presença"/"Preciso reagendar" do
// lembrete_visita (ver src/lib/whatsapp.ts) — casada pelo context.id da
// mensagem recebida, que é o wamid da própria mensagem de lembrete que
// mandamos (gravado em visitas.lembrete_whatsapp_message_id ao enviar,
// migração 0095). Não depende do texto exato do botão em nenhum outro
// lugar do app, só aqui.
async function processarRespostaLembrete(mensagem: MensagemRecebida) {
  const idMensagemOriginal = mensagem.context?.id;
  const textoBotao = mensagem.button?.text ?? mensagem.button?.payload;
  if (!idMensagemOriginal || !textoBotao) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data: visita } = await admin
    .from("visitas")
    .select("id, corretor_id, resposta_cliente")
    .eq("lembrete_whatsapp_message_id", idMensagemOriginal)
    .maybeSingle();

  // Já respondida — não reprocessa se a Meta reentregar o mesmo evento.
  if (!visita || visita.resposta_cliente) return;

  if (textoBotao === "Confirmar presença") {
    await admin
      .from("visitas")
      .update({ resposta_cliente: "confirmou", resposta_recebida_em: new Date().toISOString() })
      .eq("id", visita.id);
    await enviarTextoLivreWhatsapp(mensagem.from, "Combinado, te esperamos! ✅");
    await enviarPushParaCorretor(admin, visita.corretor_id, {
      titulo: "Cliente confirmou presença",
      corpo: "Respondeu o lembrete confirmando que vai à visita.",
      url: "/painel-negocios",
    });
  } else if (textoBotao === "Preciso reagendar") {
    await admin
      .from("visitas")
      .update({ resposta_cliente: "pediu_reagendamento", resposta_recebida_em: new Date().toISOString() })
      .eq("id", visita.id);
    const link = `https://www.redeimpulso.com.br/agendar/${visita.corretor_id}`;
    await enviarTextoLivreWhatsapp(
      mensagem.from,
      `Sem problemas! Escolha um novo horário por aqui: ${link}`,
    );
    await enviarPushParaCorretor(admin, visita.corretor_id, {
      titulo: "Cliente pediu reagendamento",
      corpo: "Respondeu o lembrete dizendo que precisa reagendar.",
      url: "/painel-negocios",
    });
  }
}

// Mensagem de TEXTO livre do cliente (não botão) — é o caminho real de
// quem lê "qualquer alteração, é só nos avisar por aqui mesmo" na
// confirmacao_visita/cancelamento_visita e responde direto. Acha o
// corretor pelo telefone de quem mandou (cliente_avulso ou, se não
// achar, a visita mais recente de um comprador logado com esse
// telefone) — mesmo padrão de busca por telefone normalizado usado em
// /api/publico/visitas/agendar.
async function processarMensagemTexto(mensagem: MensagemRecebida) {
  const texto = mensagem.text?.body?.trim();
  if (!texto) return;

  const admin = createAdminClient();
  if (!admin) return;

  const telefoneE164 = paraE164(`+${mensagem.from}`);
  if (!telefoneE164) return;
  const telefoneCanon = telefoneCanonico(telefoneE164);

  let corretorId: string | null = null;
  let visitaId: string | null = null;
  let nomeCliente = "Cliente";

  const { data: clientesAvulsos } = await admin
    .from("clientes_avulsos")
    .select("id, nome, telefone, corretor_id")
    .not("telefone", "is", null);
  const clienteAvulso = clientesAvulsos?.find((c) => {
    const e164 = paraE164(c.telefone!);
    return e164 !== null && telefoneCanonico(e164) === telefoneCanon;
  });

  if (clienteAvulso) {
    corretorId = clienteAvulso.corretor_id;
    nomeCliente = clienteAvulso.nome;
    const { data: visita } = await admin
      .from("visitas")
      .select("id")
      .eq("cliente_avulso_id", clienteAvulso.id)
      .neq("status", "cancelada")
      .order("data_hora", { ascending: false })
      .limit(1)
      .maybeSingle();
    visitaId = visita?.id ?? null;
  } else {
    const { data: compradores } = await admin
      .from("profiles")
      .select("id, nome, telefone")
      .eq("role", "comprador")
      .not("telefone", "is", null);
    const comprador = compradores?.find((c) => {
      const e164 = paraE164(c.telefone!);
      return e164 !== null && telefoneCanonico(e164) === telefoneCanon;
    });
    if (comprador) {
      nomeCliente = comprador.nome;
      const { data: visita } = await admin
        .from("visitas")
        .select("id, corretor_id")
        .eq("comprador_id", comprador.id)
        .neq("status", "cancelada")
        .order("data_hora", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (visita) {
        corretorId = visita.corretor_id;
        visitaId = visita.id;
      }
    }
  }

  // Número desconhecido (nunca agendou com ninguém) — não tem corretor
  // pra avisar, então só fica no log mesmo (já registrado por quem
  // chamou esta função).
  if (!corretorId) return;

  const { error: erroInsercao } = await admin.from("mensagens_cliente").insert({
    corretor_id: corretorId,
    visita_id: visitaId,
    nome_cliente: nomeCliente,
    telefone: telefoneE164,
    texto,
    whatsapp_message_id: mensagem.id,
  });
  // 23505 = Meta reentregou o mesmo evento (já gravamos essa mensagem) — ignora.
  if (erroInsercao && erroInsercao.code !== "23505") {
    console.error("[whatsapp webhook] falha ao gravar mensagem de cliente:", erroInsercao);
  }

  await enviarPushParaCorretor(admin, corretorId, {
    titulo: `Mensagem de ${nomeCliente}`,
    corpo: texto.length > 100 ? `${texto.slice(0, 100)}…` : texto,
    url: "/painel-negocios",
  });

  // Também manda pro WhatsApp do próprio corretor — o push depende de
  // ele ter ativado notificações (muitos ainda não ativaram), e
  // WhatsApp é o canal prioritário do produto, não o push.
  const { data: corretor } = await admin.from("profiles").select("nome, telefone").eq("id", corretorId).single();
  if (corretor?.telefone) {
    await enviarMensagemClienteParaCorretorWhatsapp({
      telefoneCorretor: corretor.telefone,
      nomeCorretor: corretor.nome,
      nomeCliente,
      textoCliente: texto,
    });
  }

  // Confirma recebimento pro cliente — sem isso ele manda a mensagem e
  // fica sem nenhum sinal de que alguém vai ver, mesmo ela agora indo
  // pro painel do corretor. Já inclui o link público de agendamento
  // (mesmo link usado em "Preciso reagendar" do lembrete, acima): quem
  // escreveu "quero mudar o dia" já sai daqui com um jeito de resolver
  // sozinho, sem precisar esperar o corretor ver e responder.
  const linkAgendar = `https://www.redeimpulso.com.br/agendar/${corretorId}`;
  await enviarTextoLivreWhatsapp(
    mensagem.from,
    `Recebemos sua mensagem! Se for sobre mudar o dia ou horário, você mesmo escolhe um novo aqui: ${linkAgendar} — ou, se preferir, aguarde que o corretor te chama por aqui.`,
  );
}

export async function POST(request: NextRequest) {
  const corpoTexto = await request.text();

  // Sem isto, qualquer um que descobrisse essa URL (e um wamid de
  // lembrete, que não é segredo — pode vazar por log) podia forjar um
  // evento de "Confirmar presença"/"Preciso reagendar" de uma visita
  // real sem autenticação nenhuma. CONFIRMADO ao vivo num QA (2026-11-18):
  // sem WHATSAPP_APP_SECRET configurado, a versão anterior deste código
  // pulava a verificação inteira e processava o evento forjado como
  // válido. Falha FECHADA agora: sem o secret configurado, rejeita tudo
  // em vez de aceitar tudo — webhook sem assinatura verificável não tem
  // por que processar nada.
  if (!process.env.WHATSAPP_APP_SECRET) {
    console.error("[whatsapp webhook] WHATSAPP_APP_SECRET não configurado — rejeitando evento.");
    return NextResponse.json({ erro: "Webhook não configurado." }, { status: 403 });
  }

  const assinaturaRecebida = request.headers.get("x-hub-signature-256") ?? "";
  const assinaturaEsperada =
    "sha256=" +
    crypto.createHmac("sha256", process.env.WHATSAPP_APP_SECRET).update(corpoTexto).digest("hex");

  const bufRecebido = Buffer.from(assinaturaRecebida);
  const bufEsperado = Buffer.from(assinaturaEsperada);
  const valida =
    bufRecebido.length === bufEsperado.length && crypto.timingSafeEqual(bufRecebido, bufEsperado);

  if (!valida) {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  const corpo = JSON.parse(corpoTexto) as {
    entry?: { changes?: { value?: { statuses?: StatusEvento[]; messages?: MensagemRecebida[] } }[] }[];
  };

  for (const entrada of corpo.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      const valor = mudanca.value ?? {};

      for (const status of valor.statuses ?? []) {
        if (status.status === "failed") {
          console.error(
            `[whatsapp webhook] FALHOU — mensagem ${status.id} para ${mascarar(status.recipient_id)}:`,
            JSON.stringify(status.errors),
          );
        } else {
          console.log(
            `[whatsapp webhook] mensagem ${status.id} para ${mascarar(status.recipient_id)}: ${status.status}`,
          );
        }
      }

      for (const mensagem of valor.messages ?? []) {
        console.log(`[whatsapp webhook] mensagem recebida de ${mascarar(mensagem.from)} (${mensagem.type})`);
        if (mensagem.type === "button") {
          await processarRespostaLembrete(mensagem);
        } else if (mensagem.type === "text") {
          await processarMensagemTexto(mensagem);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
