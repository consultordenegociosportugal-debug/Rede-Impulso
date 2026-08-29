import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANOS_DESTAQUE, criarPreferenciaCheckout, mercadoPagoConfigurado } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { erro: "Pagamento indisponível no momento." },
      { status: 503 },
    );
  }

  const { imovelId, dias } = (await request.json()) as { imovelId?: string; dias?: number };
  const plano = PLANOS_DESTAQUE.find((p) => p.dias === dias);

  if (!imovelId || !plano) {
    return NextResponse.json({ erro: "Plano inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "É preciso estar logado." }, { status: 401 });
  }

  const { data: imovel } = await supabase
    .from("imoveis")
    .select("id, titulo, vendedor_id")
    .eq("id", imovelId)
    .maybeSingle();

  if (!imovel || imovel.vendedor_id !== user.id) {
    return NextResponse.json({ erro: "Imóvel não encontrado." }, { status: 404 });
  }

  // Cria a linha primeiro (pendente, sem mp_preference_id ainda) só pra
  // ter um id — é esse id que vira o external_reference que o Mercado
  // Pago devolve no webhook, sem precisar de uma coluna extra.
  const { data: pagamento, error: erroPagamento } = await supabase
    .from("destaque_pagamentos")
    .insert({ imovel_id: imovel.id, profile_id: user.id, dias: plano.dias, valor: plano.valor })
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
    titulo: `Destaque de anúncio — ${imovel.titulo} (${plano.label})`,
    valor: plano.valor,
    externalReference: pagamento.id,
    successUrl: `${origin}/publicar-imovel/${imovel.id}/destacar?resultado=sucesso`,
    notificationUrl: `${origin}/api/destaque/webhook`,
  });

  if (!preferencia) {
    return NextResponse.json(
      { erro: "Não foi possível abrir o checkout agora. Tente de novo." },
      { status: 502 },
    );
  }

  await supabase
    .from("destaque_pagamentos")
    .update({ mp_preference_id: preferencia.id })
    .eq("id", pagamento.id);

  return NextResponse.json({ checkoutUrl: preferencia.initPoint });
}
