import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PLANOS_DESTAQUE_PARCEIRO,
  criarPreferenciaCheckout,
  mercadoPagoConfigurado,
} from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { erro: "Pagamento indisponível no momento." },
      { status: 503 },
    );
  }

  const { parceiroId, dias } = (await request.json()) as { parceiroId?: string; dias?: number };
  const plano = PLANOS_DESTAQUE_PARCEIRO.find((p) => p.dias === dias);

  if (!parceiroId || !plano) {
    return NextResponse.json({ erro: "Plano inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "É preciso estar logado." }, { status: 401 });
  }

  const { data: parceiro } = await supabase
    .from("parceiros_servico")
    .select("id, nome, profile_id")
    .eq("id", parceiroId)
    .maybeSingle();

  if (!parceiro || parceiro.profile_id !== user.id) {
    return NextResponse.json({ erro: "Serviço não encontrado." }, { status: 404 });
  }

  const { data: pagamento, error: erroPagamento } = await supabase
    .from("parceiro_destaque_pagamentos")
    .insert({ parceiro_id: parceiro.id, profile_id: user.id, dias: plano.dias, valor: plano.valor })
    .select("id")
    .single();

  if (erroPagamento || !pagamento) {
    return NextResponse.json(
      { erro: erroPagamento?.message ?? "Não foi possível iniciar o pagamento." },
      { status: 500 },
    );
  }

  const origin = request.nextUrl.origin;
  const preferencia = await criarPreferenciaCheckout({
    titulo: `Destaque de serviço — ${parceiro.nome} (${plano.label})`,
    valor: plano.valor,
    externalReference: pagamento.id,
    successUrl: `${origin}/servicos/${parceiro.id}/destacar?resultado=sucesso`,
    notificationUrl: `${origin}/api/servicos/destacar/webhook`,
  });

  if (!preferencia) {
    return NextResponse.json(
      { erro: "Não foi possível abrir o checkout agora. Tente de novo." },
      { status: 502 },
    );
  }

  await supabase
    .from("parceiro_destaque_pagamentos")
    .update({ mp_preference_id: preferencia.id })
    .eq("id", pagamento.id);

  return NextResponse.json({ checkoutUrl: preferencia.initPoint });
}
