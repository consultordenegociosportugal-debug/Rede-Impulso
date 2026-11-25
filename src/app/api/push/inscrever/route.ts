import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Salva a inscrição de push do navegador/dispositivo (ver migração
// 0100 e src/lib/push.ts). Upsert por endpoint: o mesmo navegador
// pode "reinscrever" (ex.: depois de limpar o cache) sem duplicar.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  let corpo: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { endpoint, keys } = corpo;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ erro: "Inscrição inválida." }, { status: 400 });
  }

  // onConflict por endpoint reinscreve o mesmo navegador sem duplicar.
  // Não cobre o caso raro de um dispositivo compartilhado trocar de
  // corretor logado — a RLS corretamente impede sobrescrever a
  // inscrição de outra pessoa, então esse upsert falharia ali; aceitável
  // por ora, o corretor anterior pode se desinscrever pra liberar.
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { profile_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: "endpoint" },
    );

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
