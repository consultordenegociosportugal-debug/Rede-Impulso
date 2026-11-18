import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarSolicitacaoVinculoPendenteWhatsapp } from "@/lib/whatsapp";

// Cria o pedido de vínculo (ou de virar gestor) e avisa os gestores da
// organização por WhatsApp — rota de servidor só porque o aviso precisa
// do telefone de gestores que não são o próprio usuário logado (RLS de
// profiles não libera isso pro corretor ver) e do token da Meta, que
// nunca pode ir pro navegador. O INSERT em si roda com a sessão do
// próprio usuário (createClient), então a policy "solicitante cria a
// propria" da migração 0089 continua sendo a única validação de regra
// de negócio — esta rota não reimplementa nada disso.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  let corpo: { organizacao_catalogo_id?: string; tipo?: "corretor" | "gestor" };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }
  const { organizacao_catalogo_id, tipo } = corpo;

  if (!organizacao_catalogo_id || (tipo !== "corretor" && tipo !== "gestor")) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const { error } = await supabase
    .from("solicitacoes_vinculo")
    .insert({ solicitante_id: user.id, organizacao_catalogo_id, tipo });

  if (error) {
    const mensagem =
      error.code === "23505"
        ? "Você já tem uma solicitação pendente para esta organização."
        : "Não foi possível enviar a solicitação.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }

  // Aviso por WhatsApp é melhor-esforço — a solicitação já está gravada
  // acima; nenhuma falha aqui deve virar erro pro corretor que só pediu
  // o vínculo.
  try {
    const admin = createAdminClient();
    if (admin) {
      const [{ data: solicitante }, { data: organizacao }, { data: gestores }] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", user.id).single(),
        admin.from("organizacoes_catalogo").select("nome").eq("id", organizacao_catalogo_id).single(),
        admin
          .from("gestor_perfis")
          .select("profiles:profile_id(nome, telefone)")
          .eq("organizacao_catalogo_id", organizacao_catalogo_id),
      ]);

      const nomeCorretor = solicitante?.nome ?? "Um corretor";
      const nomeOrganizacao = organizacao?.nome ?? "sua organização";

      for (const g of gestores ?? []) {
        const perfil = g.profiles as unknown as { nome: string; telefone: string | null } | null;
        if (!perfil?.telefone) continue;
        await enviarSolicitacaoVinculoPendenteWhatsapp({
          telefone: perfil.telefone,
          nomeGestor: perfil.nome,
          nomeCorretor,
          tipo,
          nomeOrganizacao,
        });
      }
    }
  } catch (erroAviso) {
    console.error("Falha ao avisar gestor sobre nova solicitação de vínculo:", erroAviso);
  }

  return NextResponse.json({ ok: true });
}
