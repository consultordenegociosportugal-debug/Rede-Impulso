import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buscarPagamento, statusInterno } from "@/lib/mercadopago";

// Mesmo parsing de notificação do webhook de destaque de imóvel
// (src/app/api/destaque/webhook) — Mercado Pago manda tanto por
// query string quanto por corpo JSON.
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
    return NextResponse.json({ ok: true });
  }

  const pagamento = await buscarPagamento(paymentId);
  if (!pagamento || !pagamento.external_reference) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  await supabase.rpc("confirmar_pagamento_destaque_parceiro", {
    p_pagamento_id: pagamento.external_reference,
    p_payment_id: paymentId,
    p_status: statusInterno(pagamento.status),
  });

  return NextResponse.json({ ok: true });
}
