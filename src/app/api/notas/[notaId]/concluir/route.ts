import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Marca um lembrete de nota como resolvido (ver migração 0099) — só
// isso, não apaga nem edita o texto da nota. RLS já restringe a
// update a corretor_id = auth.uid(); o .select().single() depois do
// update é o que detecta "não encontrou" (RLS deixa passar como 0
// linhas afetadas, não como erro).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notaId: string }> },
) {
  const { notaId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("clientes_notas")
    .update({ lembrete_concluido_em: new Date().toISOString() })
    .eq("id", notaId)
    .eq("corretor_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ erro: "Lembrete não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
