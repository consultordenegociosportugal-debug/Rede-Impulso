import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Grava a resposta da pesquisa de satisfação — sem login, o token da
// visita (nps_token) é a autorização. Service role porque quem responde
// nunca tem sessão autenticada nesta rota.
export async function POST(request: NextRequest) {
  const { token, nota, comentario } = (await request.json()) as {
    token?: string;
    nota?: number;
    comentario?: string;
  };

  if (!token || typeof nota !== "number" || nota < 0 || nota > 10) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }

  const { data: visita } = await admin
    .from("visitas")
    .select("id")
    .eq("nps_token", token)
    .single();

  if (!visita) {
    return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  }

  const { error } = await admin.from("nps_respostas").insert({
    visita_id: visita.id,
    nota,
    comentario: comentario?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ erro: "Essa visita já foi avaliada." }, { status: 409 });
    }
    return NextResponse.json({ erro: "Não foi possível registrar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
