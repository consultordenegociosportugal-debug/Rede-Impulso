import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarRadarMotorista } from "@/lib/motorista/radar";

// Job diário do Radar do motorista (migração 0034). Disparado pelo Vercel
// Cron com CRON_SECRET, ou por um admin logado (para testar na hora).
// Grava com a service role, igual aos agentes de elétricos (0033).

export const maxDuration = 300;

async function autorizado(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") === `Bearer ${segredo}`) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return Boolean(perfil?.is_admin);
}

export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ erro: "ANTHROPIC_API_KEY ausente." }, { status: 503 });
  }
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY ausente." }, { status: 503 });
  }

  // Data no fuso de Brasília — o cron roda de madrugada em UTC.
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  try {
    const resultado = await gerarRadarMotorista(supabase, hoje);
    return NextResponse.json({ ok: true, data_referencia: hoje, ...resultado });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 502 },
    );
  }
}
