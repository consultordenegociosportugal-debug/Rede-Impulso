import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buscarAssinatura, statusAssinaturaInterno } from "@/lib/mercadopago";

// Mesmo formato de notificação do webhook de Destaque (migração 0024) —
// query string ou corpo JSON, `type`/`topic` variando com a versão da API.
function extrairPreapprovalId(
  request: NextRequest,
  corpo: Record<string, unknown> | null,
): string | null {
  const params = request.nextUrl.searchParams;

  const tipo = params.get("type") ?? (corpo?.type as string | undefined);
  if (tipo && tipo !== "subscription_preapproval" && tipo !== "preapproval") return null;

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

  const preapprovalId = extrairPreapprovalId(request, corpo);
  if (!preapprovalId) {
    return NextResponse.json({ ok: true });
  }

  const assinaturaMp = await buscarAssinatura(preapprovalId);
  if (!assinaturaMp || !assinaturaMp.external_reference) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  await supabase.rpc("confirmar_assinatura", {
    p_assinatura_id: assinaturaMp.external_reference,
    p_status: statusAssinaturaInterno(assinaturaMp.status),
  });

  return NextResponse.json({ ok: true });
}
