// Confirmação de agendamento via WhatsApp (Meta Cloud API) — mesmo padrão
// opcional do resend.ts/mercadopago.ts: sem as variáveis de ambiente,
// whatsappConfigurado() devolve false e ninguém tenta enviar, nenhuma rota
// quebra, só deixa de mandar.
//
// Mensagem de negócio pra um número que não iniciou a conversa exige um
// "message template" pré-aprovado pela Meta (WhatsApp Manager → Modelos de
// mensagem). Crie um chamado exatamente como WHATSAPP_TEMPLATE_CONFIRMACAO
// (padrão "confirmacao_visita"), categoria Utilidade, idioma pt_BR, corpo:
//   "Olá {{1}}! Sua visita com {{2}} ficou confirmada para {{3}} às {{4}}
//    pela Rede Impulso."
// Os 4 parâmetros têm que vir nessa ordem: nome de quem recebe, nome da
// contraparte, data, hora.

const VERSAO_GRAPH = "v21.0";

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

const NOME_TEMPLATE = process.env.WHATSAPP_TEMPLATE_CONFIRMACAO || "confirmacao_visita";

/**
 * Converte um telefone brasileiro em qualquer formatação comum (com DDD,
 * com ou sem máscara) pro E.164 que a API do WhatsApp exige. Assume Brasil
 * (+55) — não há telefone de outro país coletado em nenhum cadastro hoje.
 */
export function paraE164Brasil(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 11) return null;
  return `+55${digitos}`;
}

type EnvioConfirmacao = {
  telefone: string;
  nomeDestinatario: string;
  nomeContraparte: string;
  dataFormatada: string;
  horaFormatada: string;
};

export async function enviarConfirmacaoWhatsapp(params: EnvioConfirmacao): Promise<void> {
  if (!whatsappConfigurado()) return;

  const numero = paraE164Brasil(params.telefone);
  if (!numero) return;

  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${VERSAO_GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: numero,
          type: "template",
          template: {
            name: NOME_TEMPLATE,
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: params.nomeDestinatario },
                  { type: "text", text: params.nomeContraparte },
                  { type: "text", text: params.dataFormatada },
                  { type: "text", text: params.horaFormatada },
                ],
              },
            ],
          },
        }),
      },
    );

    if (!resposta.ok) {
      console.error("Falha ao enviar WhatsApp:", resposta.status, await resposta.text());
    }
  } catch (erro) {
    // Igual ao e-mail: a visita já está confirmada no banco antes desse
    // envio rodar — uma falha aqui (template não aprovado, número
    // inválido, Meta fora do ar) não pode derrubar o agendamento.
    console.error("Erro ao enviar WhatsApp:", erro);
  }
}
