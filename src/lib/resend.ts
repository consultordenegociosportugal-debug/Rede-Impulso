import { Resend } from "resend";

// Camada opcional, mesmo padrao do mercadopago.ts e do google-calendar.ts:
// sem RESEND_API_KEY, resendConfigurado() devolve false e ninguem tenta
// mandar e-mail — nenhuma rota quebra, so deixa de enviar.
export function resendConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

let cliente: Resend | null = null;

export function getResend(): Resend | null {
  if (!resendConfigurado()) return null;
  if (!cliente) cliente = new Resend(process.env.RESEND_API_KEY);
  return cliente;
}

// "Rede Impulso <onboarding@resend.dev>" funciona pra testar sem
// dominio proprio verificado no Resend; troque EMAIL_REMETENTE assim
// que tiver um dominio verificado (ex: "Rede Impulso <contato@seudominio.com>").
export const EMAIL_REMETENTE = process.env.EMAIL_REMETENTE || "Rede Impulso <onboarding@resend.dev>";
