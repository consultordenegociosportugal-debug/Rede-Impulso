import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { horariosDisponiveis } from "@/lib/disponibilidade";

// Horários livres do responsável por um imóvel, num dia específico —
// consultado pelo seletor de horário em AgendarVisitaButton antes de
// mostrar os botões de slot. Sem disponibilidade configurada pelo
// corretor/vendedor, `configurado: false` avisa o front pra cair no
// formulário antigo (data/hora livre, sem confirmação automática).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const imovelId = searchParams.get("imovel_id");
  const data = searchParams.get("data");

  if (!imovelId || !data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const { data: corretorId, error: erroRpc } = await supabase.rpc(
    "corretor_responsavel_imovel",
    { p_imovel_id: imovelId },
  );

  if (erroRpc || !corretorId) {
    return NextResponse.json({ erro: "Imóvel não encontrado." }, { status: 404 });
  }

  const resultado = await horariosDisponiveis(supabase, corretorId, data);
  return NextResponse.json(resultado);
}
