import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paraE164 } from "@/lib/telefone";
import { enviarCodigoTelefone, gerarCodigo } from "@/lib/telefone-otp";

const COOLDOWN_SEGUNDOS = 30;
const VALIDADE_MINUTOS = 10;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  const { telefone } = (await request.json()) as { telefone?: string };
  if (!telefone || !paraE164(telefone)) {
    return NextResponse.json({ erro: "Telefone inválido." }, { status: 400 });
  }

  // Evita reenvio em sequência disparar vários WhatsApp/SMS reais —
  // cada envio é uma mensagem paga de verdade, não só um e-mail grátis.
  const { data: pendente } = await supabase
    .from("telefone_codigos")
    .select("created_at")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (pendente) {
    const segundosDesde = (Date.now() - new Date(pendente.created_at).getTime()) / 1000;
    if (segundosDesde < COOLDOWN_SEGUNDOS) {
      return NextResponse.json(
        { erro: "Aguarde um instante antes de pedir outro código.", espereSegundos: Math.ceil(COOLDOWN_SEGUNDOS - segundosDesde) },
        { status: 429 },
      );
    }
  }

  const codigo = gerarCodigo();
  const { enviado, canal } = await enviarCodigoTelefone(telefone, codigo);

  if (!enviado) {
    return NextResponse.json(
      { erro: "Não foi possível enviar o código agora. Tente de novo em instantes." },
      { status: 502 },
    );
  }

  const { error: erroUpsert } = await supabase.from("telefone_codigos").upsert({
    profile_id: user.id,
    telefone,
    codigo,
    canal,
    tentativas: 0,
    expira_em: new Date(Date.now() + VALIDADE_MINUTOS * 60_000).toISOString(),
    created_at: new Date().toISOString(),
  });

  if (erroUpsert) {
    return NextResponse.json({ erro: "Não foi possível registrar o código. Tente de novo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, canal });
}
