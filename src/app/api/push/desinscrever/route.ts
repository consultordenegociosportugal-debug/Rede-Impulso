import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  let corpo: { endpoint?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!corpo.endpoint) {
    return NextResponse.json({ erro: "endpoint é obrigatório." }, { status: 400 });
  }

  await supabase.from("push_subscriptions").delete().eq("endpoint", corpo.endpoint);

  return NextResponse.json({ ok: true });
}
