import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Exclusão da própria conta — o usuário confirma na tela de editar
// perfil. Usa service role porque apagar de `auth.users` é uma
// operação admin; o resto (profiles, corretor_perfis, visitas, etc.)
// cai em cascata pelas FKs já existentes no banco.
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ erro: "Não foi possível excluir a conta." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
