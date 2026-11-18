import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarRespostaVinculoWhatsapp } from "@/lib/whatsapp";

// Aprova/recusa e avisa o solicitante por WhatsApp — rota de servidor
// pelo mesmo motivo da /api/solicitacoes-vinculo: precisa do telefone
// de outra pessoa e do token da Meta. A aprovação em si continua
// inteiramente dentro de responder_solicitacao_vinculo() (migração
// 0089, security definer) — esta rota só lê os dados pra montar o
// aviso antes e depois de chamar a function, nunca decide nada sozinha.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  let corpo: { solicitacao_id?: string; aprovar?: boolean };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }
  const { solicitacao_id, aprovar } = corpo;

  if (!solicitacao_id || typeof aprovar !== "boolean") {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  // Lida antes de responder — depois de respondida, a mesma leitura
  // (RLS de "gestor ve da sua organizacao") ainda funciona, mas pegar o
  // estado pendente aqui deixa claro que isto é só pra montar o aviso,
  // não parte da decisão em si.
  const { data: solicitacao } = await supabase
    .from("solicitacoes_vinculo")
    .select("solicitante_id, organizacao_catalogo_id, tipo")
    .eq("id", solicitacao_id)
    .single();

  const { error } = await supabase.rpc("responder_solicitacao_vinculo", {
    p_solicitacao_id: solicitacao_id,
    p_aprovar: aprovar,
  });

  if (error) {
    return NextResponse.json({ erro: error.message || "Não foi possível responder." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    if (admin && solicitacao) {
      const [{ data: solicitante }, { data: organizacao }] = await Promise.all([
        admin.from("profiles").select("nome, telefone").eq("id", solicitacao.solicitante_id).single(),
        admin.from("organizacoes_catalogo").select("nome").eq("id", solicitacao.organizacao_catalogo_id).single(),
      ]);

      if (solicitante?.telefone) {
        await enviarRespostaVinculoWhatsapp({
          telefone: solicitante.telefone,
          nomeCorretor: solicitante.nome,
          nomeOrganizacao: organizacao?.nome ?? "a organização",
          tipo: solicitacao.tipo as "corretor" | "gestor",
          aprovado: aprovar,
        });
      }
    }
  } catch (erroAviso) {
    console.error("Falha ao avisar corretor sobre resposta de vínculo:", erroAviso);
  }

  return NextResponse.json({ ok: true });
}
