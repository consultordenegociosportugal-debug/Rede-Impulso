import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { enviarCancelamentoWhatsapp } from "@/lib/whatsapp";
import { escaparHtml } from "@/lib/escapar-html";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "America/Sao_Paulo",
});
const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

// Aviso de cancelamento — extraído de /api/visitas/cancelar pra ser
// reaproveitado também quando uma visita é cancelada por tabela (conta
// da contraparte excluída), não só pelo clique manual do corretor.
// `motivoExtra` só entra no e-mail (o corpo do template de WhatsApp é
// fixo, aprovado pela Meta — não dá pra variar o texto por canal).
export async function avisarCancelamento(dados: {
  destinatarioNome: string;
  destinatarioEmail: string | null;
  destinatarioTelefone: string | null;
  nomeContraparte: string;
  dataHoraIso: string;
  motivoExtra?: string;
}): Promise<{ precisaAvisarManualmente: boolean }> {
  const quandoIso = new Date(dados.dataHoraIso);
  const dataFormatada = formatoData.format(quandoIso);
  const horaFormatada = formatoHora.format(quandoIso);

  if (dados.destinatarioEmail && resendConfigurado()) {
    try {
      await getResend()!.emails.send({
        from: EMAIL_REMETENTE,
        to: dados.destinatarioEmail,
        subject: `Visita com ${dados.nomeContraparte} cancelada`,
        html: `
          <p>Olá, ${escaparHtml(dados.destinatarioNome)}.</p>
          <p>Sua visita com <strong>${escaparHtml(dados.nomeContraparte)}</strong>, marcada para
          <strong>${dataFormatada} às ${horaFormatada}</strong>, foi cancelada.</p>
          ${dados.motivoExtra ? `<p>${escaparHtml(dados.motivoExtra)}</p>` : ""}
          ${rodapeTransacionalHtml()}
        `,
      });
    } catch {
      // Best-effort — a visita já está cancelada no banco.
    }
  }

  let enviado = true;
  if (dados.destinatarioTelefone) {
    enviado = await enviarCancelamentoWhatsapp({
      telefone: dados.destinatarioTelefone,
      nomeDestinatario: dados.destinatarioNome,
      nomeContraparte: dados.nomeContraparte,
      dataFormatada,
      horaFormatada,
    });
  }

  return { precisaAvisarManualmente: Boolean(dados.destinatarioTelefone) && !enviado };
}
