import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Marca uma mensagem de cliente (ver migração 0102) como lida — só
// isso, não responde nem apaga nada. RLS já restringe a update a
// corretor_id = auth.uid(); o .select().single() depois do update é o
// que detecta "não encontrou" (RLS deixa passar como 0 linhas
// afetadas, não como erro), mesmo padrão de /api/notas/[notaId]/concluir.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("mensagens_cliente")
    .update({ lida_em: new Date().toISOString() })
    .eq("id", id)
    .eq("corretor_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ erro: "Mensagem não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
