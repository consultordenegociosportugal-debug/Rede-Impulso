// Envio do código de verificação de telefone — WhatsApp primeiro
// (template "codigo_verificacao", categoria Autenticação, aprovado pela
// Meta), com SMS como reserva. Mesmo padrão opcional do resend.ts/
// whatsapp.ts: sem as variáveis de ambiente, a função correspondente
// devolve false e a próxima da cadeia é tentada, sem derrubar nada.
import { paraE164 } from "@/lib/telefone";

const VERSAO_GRAPH = "v21.0";
const NOME_TEMPLATE_OTP = "codigo_verificacao";

export function gerarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export function smsConfigurado(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER,
  );
}

async function enviarCodigoWhatsapp(telefone: string, codigo: string): Promise<boolean> {
  if (!whatsappConfigurado()) return false;
  const numero = paraE164(telefone);
  if (!numero) return false;

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
            name: NOME_TEMPLATE_OTP,
            language: { code: "pt_BR" },
            components: [
              { type: "body", parameters: [{ type: "text", text: codigo }] },
              {
                // A Meta cria o botão "copiar código" das Authentication
                // templates como tipo URL por baixo dos panos (confirmado
                // consultando o template depois de criado) — manda como
                // sub_type "url" com o código de texto simples, não
                // "copy_code"/"coupon_code" como a documentação sugere.
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: codigo }],
              },
            ],
          },
        }),
      },
    );
    if (!resposta.ok) {
      console.error("Falha ao enviar código por WhatsApp:", resposta.status, await resposta.text());
      return false;
    }
    return true;
  } catch (erro) {
    console.error("Erro ao enviar código por WhatsApp:", erro);
    return false;
  }
}

async function enviarCodigoSms(telefone: string, codigo: string): Promise<boolean> {
  if (!smsConfigurado()) return false;
  const numero = paraE164(telefone);
  if (!numero) return false;

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID as string;
    const resposta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: numero,
        From: process.env.TWILIO_FROM_NUMBER as string,
        Body: `Seu código de verificação Rede Impulso: ${codigo}`,
      }),
    });
    if (!resposta.ok) {
      console.error("Falha ao enviar código por SMS:", resposta.status, await resposta.text());
      return false;
    }
    return true;
  } catch (erro) {
    console.error("Erro ao enviar código por SMS:", erro);
    return false;
  }
}

export async function enviarCodigoTelefone(
  telefone: string,
  codigo: string,
): Promise<{ enviado: boolean; canal: "whatsapp" | "sms" | null }> {
  if (await enviarCodigoWhatsapp(telefone, codigo)) return { enviado: true, canal: "whatsapp" };
  if (await enviarCodigoSms(telefone, codigo)) return { enviado: true, canal: "sms" };
  return { enviado: false, canal: null };
}
