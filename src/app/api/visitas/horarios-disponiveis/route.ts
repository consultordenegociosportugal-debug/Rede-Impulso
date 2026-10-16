import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { horariosDisponiveis } from "@/lib/disponibilidade";

// Horários livres de um responsável num dia específico — consultado
// antes de mostrar os botões de slot. Sem disponibilidade configurada,
// `configurado: false` avisa o front. Aceita `corretor_id` direto
// (agendamento direto, sem imóvel) ou `imovel_id` (compatibilidade com
// o fluxo antigo, que resolve o corretor via o imóvel).
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
  const corretorIdParam = searchParams.get("corretor_id");
  const data = searchParams.get("data");

  if ((!imovelId && !corretorIdParam) || !data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  let corretorId = corretorIdParam;
  if (!corretorId && imovelId) {
    const { data: resolvido, error: erroRpc } = await supabase.rpc(
      "corretor_responsavel_imovel",
      { p_imovel_id: imovelId },
    );
    if (erroRpc || !resolvido) {
      return NextResponse.json({ erro: "Imóvel não encontrado." }, { status: 404 });
    }
    corretorId = resolvido;
  }

  const resultado = await horariosDisponiveis(supabase, corretorId as string, data);
  return NextResponse.json(resultado);
}
