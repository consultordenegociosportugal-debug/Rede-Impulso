import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buscarPagamento, statusInterno } from "@/lib/mercadopago";

// O Mercado Pago manda a notificação de duas formas ao longo do
// tempo — query string (`?type=payment&data.id=123`, ou o formato
// antigo `?topic=payment&id=123`) e corpo JSON. Aceita as duas em vez
// de apostar em uma só.
function extrairPaymentId(request: NextRequest, corpo: Record<string, unknown> | null): string | null {
  const params = request.nextUrl.searchParams;

  const tipo = params.get("type") ?? params.get("topic") ?? (corpo?.type as string | undefined);
  if (tipo && tipo !== "payment") return null;

  const dataId = params.get("data.id") ?? params.get("id");
  if (dataId) return dataId;

  const dados = corpo?.data as { id?: string } | undefined;
  return dados?.id ?? null;
}

export async function POST(request: NextRequest) {
  let corpo: Record<string, unknown> | null = null;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }

  const paymentId = extrairPaymentId(request, corpo);
  if (!paymentId) {
    // Notificação de outro tipo de evento (ex: merchant_order) — nada a fazer.
    return NextResponse.json({ ok: true });
  }

  // Nunca confiar no status que vem na notificação — sempre confirmar
  // direto na API do Mercado Pago com nosso próprio access token.
  const pagamento = await buscarPagamento(paymentId);
  if (!pagamento || !pagamento.external_reference) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  await supabase.rpc("confirmar_pagamento_destaque", {
    p_pagamento_id: pagamento.external_reference,
    p_payment_id: paymentId,
    p_status: statusInterno(pagamento.status),
  });

  return NextResponse.json({ ok: true });
}
