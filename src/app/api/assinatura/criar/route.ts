import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PLANOS_PROFISSIONAL,
  CICLOS,
  criarAssinatura,
  mercadoPagoConfigurado,
  valorMensalComDesconto,
  type CicloCobranca,
} from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { erro: "Assinatura indisponível no momento." },
      { status: 503 },
    );
  }

  const { plano, ciclo } = (await request.json()) as { plano?: string; ciclo?: string };
  const escolhido = PLANOS_PROFISSIONAL.find((p) => p.id === plano);
  const cicloEscolhido = CICLOS.find((c) => c.id === ciclo)?.id as CicloCobranca | undefined;

  if (!escolhido || !cicloEscolhido) {
    return NextResponse.json({ erro: "Plano inválido." }, { status: 400 });
  }

  const valorMensal = valorMensalComDesconto(escolhido, cicloEscolhido);

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
      plano: `${escolhido.id}-${cicloEscolhido}`,
      limite: escolhido.limiteImoveis,
      limite_equipe: escolhido.limiteEquipe,
      valor: valorMensal,
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
    reason: `Rede Impulso — ${escolhido.label} (${cicloEscolhido})`,
    valor: valorMensal,
    ciclo: cicloEscolhido,
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
