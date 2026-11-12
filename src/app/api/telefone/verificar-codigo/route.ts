import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_TENTATIVAS = 5;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  const { codigo } = (await request.json()) as { codigo?: string };
  const codigoLimpo = (codigo ?? "").trim();
  if (!codigoLimpo) {
    return NextResponse.json({ erro: "Digite o código recebido." }, { status: 400 });
  }

  const { data: pendente } = await supabase
    .from("telefone_codigos")
    .select("telefone, codigo, tentativas, expira_em")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!pendente) {
    return NextResponse.json({ erro: "Nenhum código pendente — peça um novo." }, { status: 404 });
  }

  if (new Date(pendente.expira_em).getTime() < Date.now()) {
    return NextResponse.json({ erro: "Código expirado — peça um novo." }, { status: 410 });
  }

  if (pendente.tentativas >= MAX_TENTATIVAS) {
    return NextResponse.json({ erro: "Muitas tentativas erradas — peça um novo código." }, { status: 429 });
  }

  if (pendente.codigo !== codigoLimpo) {
    await supabase
      .from("telefone_codigos")
      .update({ tentativas: pendente.tentativas + 1 })
      .eq("profile_id", user.id);
    return NextResponse.json({ erro: "Código inválido. Confira ou peça um novo." }, { status: 400 });
  }

  // Grava o telefone verificado em profiles (pode diferir do que já
  // estava lá, se a verificação começou a partir de uma edição de
  // perfil que ainda não tinha sido salva) e some com o código usado.
  const { error: erroProfile } = await supabase
    .from("profiles")
    .update({ telefone: pendente.telefone, telefone_verificado_em: new Date().toISOString() })
    .eq("id", user.id);

  if (erroProfile) {
    return NextResponse.json({ erro: "Código certo, mas não deu pra salvar. Tente de novo." }, { status: 500 });
  }

  await supabase.from("telefone_codigos").delete().eq("profile_id", user.id);

  return NextResponse.json({ ok: true });
}
