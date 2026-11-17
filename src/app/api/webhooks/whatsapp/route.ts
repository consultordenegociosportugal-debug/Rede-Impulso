import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarTextoLivreWhatsapp } from "@/lib/whatsapp";

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

type MensagemRecebida = {
  from: string;
  type: string;
  context?: { id?: string };
  button?: { text?: string; payload?: string };
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
  }
}

export async function POST(request: NextRequest) {
  const corpoTexto = await request.text();

  // Sem isto, qualquer um que descobrisse essa URL podia forjar um
  // evento de "delivered" falso. app_secret é opcional só pra não
  // travar o webhook inteiro antes do dono configurar essa variável —
  // mas sem ela a verificação de assinatura fica desligada.
  if (process.env.WHATSAPP_APP_SECRET) {
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
            `[whatsapp webhook] FALHOU — mensagem ${status.id} para ${status.recipient_id}:`,
            JSON.stringify(status.errors),
          );
        } else {
          console.log(
            `[whatsapp webhook] mensagem ${status.id} para ${status.recipient_id}: ${status.status}`,
          );
        }
      }

      for (const mensagem of valor.messages ?? []) {
        console.log(`[whatsapp webhook] mensagem recebida de ${mensagem.from} (${mensagem.type})`);
        if (mensagem.type === "button") {
          await processarRespostaLembrete(mensagem);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
