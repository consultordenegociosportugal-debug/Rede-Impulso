// Integração com o Mercado Pago (Checkout Pro) via REST puro — mesmo
// padrão do src/lib/google-calendar.ts: sem SDK pesado, só os dois
// endpoints que a Rede Impulso realmente usa (criar preferência de
// pagamento e consultar um pagamento pelo id).
//
// Regra de ouro deste módulo: é uma camada OPCIONAL. Sem
// MERCADOPAGO_ACCESS_TOKEN, mercadoPagoConfigurado() devolve false e
// nada mais é chamado — mesmo padrão do google-calendar.ts e do
// /api/assistente.

const MP_API = "https://api.mercadopago.com";

export type PlanoDestaque = { dias: number; valor: number; label: string };

export const PLANOS_DESTAQUE: PlanoDestaque[] = [
  { dias: 7, valor: 19.9, label: "7 dias" },
  { dias: 15, valor: 34.9, label: "15 dias" },
  { dias: 30, valor: 59.9, label: "30 dias" },
];

export function mercadoPagoConfigurado(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

// Ticket bem menor que o destaque de imóvel — pensado pra prestador
// autônomo (pintor, eletricista) no diretório de serviços, não pra
// imobiliária. Ver migração 0029.
export const PLANOS_DESTAQUE_PARCEIRO: PlanoDestaque[] = [
  { dias: 7, valor: 9.9, label: "7 dias" },
  { dias: 15, valor: 16.9, label: "15 dias" },
  { dias: 30, valor: 29.9, label: "30 dias" },
];

type PreferenciaResposta = { id: string; initPoint: string };

/** Cria a preferência de checkout. Null se a integração não estiver configurada ou a chamada falhar. */
export async function criarPreferenciaCheckout(params: {
  titulo: string;
  valor: number;
  externalReference: string;
  successUrl: string;
  notificationUrl: string;
}): Promise<PreferenciaResposta | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const resposta = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: params.titulo,
            quantity: 1,
            unit_price: params.valor,
            currency_id: "BRL",
          },
        ],
        back_urls: {
          success: params.successUrl,
          failure: params.successUrl,
          pending: params.successUrl,
        },
        auto_return: "approved",
        external_reference: params.externalReference,
        notification_url: params.notificationUrl,
      }),
    });

    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (!dados.id || !dados.init_point) return null;
    return { id: dados.id, initPoint: dados.init_point };
  } catch {
    return null;
  }
}

type PagamentoMP = {
  status: string;
  external_reference: string | null;
};

/** Busca um pagamento pelo id direto na API do Mercado Pago — nunca confiar só no corpo do webhook. */
export async function buscarPagamento(paymentId: string): Promise<PagamentoMP | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const resposta = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    return { status: dados.status, external_reference: dados.external_reference ?? null };
  } catch {
    return null;
  }
}

/** Mercado Pago usa nomes de status próprios; a Rede Impulso só guarda três. */
export function statusInterno(statusMp: string): "aprovado" | "rejeitado" | "pendente" {
  if (statusMp === "approved") return "aprovado";
  if (statusMp === "rejected" || statusMp === "cancelled") return "rejeitado";
  return "pendente";
}

// ---------- Plano Profissional (assinatura recorrente) ----------

export type PlanoProfissional = {
  id: "5" | "15" | "20";
  limite: number;
  valor: number;
  label: string;
  destaque?: string;
};

export const PLANOS_PROFISSIONAL: PlanoProfissional[] = [
  { id: "5", limite: 5, valor: 139.9, label: "Profissional 5" },
  { id: "15", limite: 15, valor: 259.9, label: "Profissional 15", destaque: "Mais escolhido" },
  { id: "20", limite: 20, valor: 279.9, label: "Profissional 20" },
];

/** Cria a assinatura recorrente (preapproval). Null se não configurado ou a chamada falhar. */
export async function criarAssinatura(params: {
  reason: string;
  valor: number;
  payerEmail: string;
  externalReference: string;
  backUrl: string;
  notificationUrl: string;
}): Promise<PreferenciaResposta | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const resposta = await fetch(`${MP_API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: params.reason,
        external_reference: params.externalReference,
        payer_email: params.payerEmail,
        back_url: params.backUrl,
        notification_url: params.notificationUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: params.valor,
          currency_id: "BRL",
        },
        status: "pending",
      }),
    });

    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (!dados.id || !dados.init_point) return null;
    return { id: dados.id, initPoint: dados.init_point };
  } catch {
    return null;
  }
}

/** Busca uma assinatura pelo id direto na API — nunca confiar só no corpo do webhook. */
export async function buscarAssinatura(preapprovalId: string): Promise<PagamentoMP | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const resposta = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    return { status: dados.status, external_reference: dados.external_reference ?? null };
  } catch {
    return null;
  }
}

/** Preapproval tem seu próprio vocabulário de status, diferente de payments. */
export function statusAssinaturaInterno(
  statusMp: string,
): "ativa" | "pausada" | "cancelada" | "pendente" {
  if (statusMp === "authorized") return "ativa";
  if (statusMp === "paused") return "pausada";
  if (statusMp === "cancelled") return "cancelada";
  return "pendente";
}
