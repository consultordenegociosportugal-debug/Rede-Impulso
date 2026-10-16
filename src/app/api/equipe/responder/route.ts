import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Aceitar/recusar um convite de equipe. Precisa da service role porque,
// antes de aceitar, o corretor não tem nenhum vínculo com a linha do
// convite (que pertence à imobiliária) — a validação de autorização é
// feita aqui no servidor, não por RLS (ver migração 0047).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { token, aceitar } = await request.json();
  if (!token || typeof aceitar !== "boolean") {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }

  const { data: convite } = await admin
    .from("convites_equipe")
    .select("id, email, imobiliaria_id, status")
    .eq("token", token)
    .single();

  if (!convite) {
    return NextResponse.json({ erro: "Convite não encontrado." }, { status: 404 });
  }

  if (convite.status !== "pendente") {
    return NextResponse.json({ erro: "Esse convite já foi respondido ou cancelado." }, { status: 409 });
  }

  if (convite.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { erro: `Esse convite é para ${convite.email}. Entre com essa conta para responder.` },
      { status: 403 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "corretor") {
    return NextResponse.json(
      { erro: "Só contas de corretor podem aceitar convite de equipe." },
      { status: 400 },
    );
  }

  if (aceitar) {
    // Regra de ouro da migração 0047: quem grava o próprio
    // imobiliaria_id é o corretor (auth.uid() = profile_id), com o
    // client normal — não o admin.
    const { error: erroVinculo } = await supabase
      .from("corretor_perfis")
      .update({ imobiliaria_id: convite.imobiliaria_id })
      .eq("profile_id", user.id);

    if (erroVinculo) {
      return NextResponse.json({ erro: "Não foi possível vincular à imobiliária." }, { status: 500 });
    }
  }

  await admin
    .from("convites_equipe")
    .update({ status: aceitar ? "aceito" : "recusado", respondido_em: new Date().toISOString() })
    .eq("id", convite.id);

  return NextResponse.json({ ok: true, aceito: aceitar });
}
