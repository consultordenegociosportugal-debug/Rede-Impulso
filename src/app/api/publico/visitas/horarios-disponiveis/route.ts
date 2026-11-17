import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { horariosDisponiveis } from "@/lib/disponibilidade";

// Mesma coisa que /api/visitas/horarios-disponiveis, mas sem exigir
// login — é o que o link público de agendamento (src/app/agendar/[id])
// chama antes do cliente nem ter conta. Via service role porque não há
// sessão nenhuma pra RLS considerar; só devolve horários livres, nada
// sensível.
export async function GET(request: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ erro: "Serviço indisponível no momento." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const corretorId = searchParams.get("corretor_id");
  const data = searchParams.get("data");

  if (!corretorId || !data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const { data: corretorPerfil } = await admin
    .from("corretor_perfis")
    .select("profile_id")
    .eq("profile_id", corretorId)
    .maybeSingle();
  if (!corretorPerfil) {
    return NextResponse.json({ erro: "Corretor não encontrado." }, { status: 404 });
  }

  const resultado = await horariosDisponiveis(admin, corretorId, data);
  return NextResponse.json(resultado);
}
