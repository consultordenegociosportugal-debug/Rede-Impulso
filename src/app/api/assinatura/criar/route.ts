import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANOS_PROFISSIONAL, criarAssinatura, mercadoPagoConfigurado } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { erro: "Assinatura indisponível no momento." },
      { status: 503 },
    );
  }

  const { plano } = (await request.json()) as { plano?: string };
  const escolhido = PLANOS_PROFISSIONAL.find((p) => p.id === plano);

  if (!escolhido) {
    return NextResponse.json({ erro: "Plano inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ erro: "É preciso estar logado." }, { status: 401 });
  }

  const { data: assinatura, error: erroAssinatura } = await supabase
    .from("assinaturas_plano")
    .insert({
      profile_id: user.id,
      plano: escolhido.id,
      limite: escolhido.limite,
      valor: escolhido.valor,
    })
    .select("id")
    .single();

  if (erroAssinatura || !assinatura) {
    return NextResponse.json(
      { erro: erroAssinatura?.message ?? "Não foi possível iniciar a assinatura." },
      { status: 500 },
    );
  }

  const origin = request.nextUrl.origin;
  const preapproval = await criarAssinatura({
    reason: `Rede Impulso — ${escolhido.label}`,
    valor: escolhido.valor,
    payerEmail: user.email,
    externalReference: assinatura.id,
    backUrl: `${origin}/planos?resultado=sucesso`,
    notificationUrl: `${origin}/api/assinatura/webhook`,
  });

  if (!preapproval) {
    return NextResponse.json(
      { erro: "Não foi possível abrir o checkout agora. Tente de novo." },
      { status: 502 },
    );
  }

  await supabase
    .from("assinaturas_plano")
    .update({ mp_preapproval_id: preapproval.id })
    .eq("id", assinatura.id);

  return NextResponse.json({ checkoutUrl: preapproval.initPoint });
}
