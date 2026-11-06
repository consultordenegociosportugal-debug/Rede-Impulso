import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarCancelamento } from "@/lib/avisar-cancelamento";

type Pessoa = { nome: string; email: string | null; telefone: string | null } | null;
type VisitaAfetada = {
  id: string;
  data_hora: string;
  corretor_id: string;
  comprador_id: string | null;
  comprador: Pessoa;
  cliente_avulso: Pessoa;
  corretor: Pessoa;
};

// Exclusão da própria conta — o usuário confirma na tela de editar
// perfil. Usa service role porque apagar de `auth.users` é uma
// operação admin; o resto (profiles, corretor_perfis, visitas, etc.)
// cai em cascata pelas FKs já existentes no banco.
//
// Antes de apagar: visitas futuras ainda ativas (solicitada/confirmada)
// em que esta conta é corretor OU cliente são canceladas e a
// CONTRAPARTE é avisada por e-mail/WhatsApp. Sem isso, quem ficava do
// outro lado via a visita sumir sem explicação (se o cliente exclui a
// conta — comprador_id tinha "on delete cascade") ou travada pra sempre
// como "confirmada" sem ninguém nunca avisar que a visita não vai mais
// acontecer (se o corretor exclui — corretor_id vira null, mas o status
// nunca mudava sozinho). Ver migração 0068.
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

  const { data: visitasData } = await admin
    .from("visitas")
    .select(
      "id, data_hora, corretor_id, comprador_id, comprador:comprador_id(nome, email, telefone), cliente_avulso:cliente_avulso_id(nome, email, telefone), corretor:corretor_id(nome, email, telefone)",
    )
    .or(`comprador_id.eq.${user.id},corretor_id.eq.${user.id}`)
    .in("status", ["solicitada", "confirmada"])
    .gte("data_hora", new Date().toISOString());

  const visitasAfetadas = (visitasData ?? []) as unknown as VisitaAfetada[];

  for (const visita of visitasAfetadas) {
    const { error: erroUpdate } = await admin
      .from("visitas")
      .update({ status: "cancelada" })
      .eq("id", visita.id);
    if (erroUpdate) continue; // melhor tentar as próximas do que travar a exclusão inteira

    // Quem exclui a conta é um dos dois lados da visita — a contraparte
    // é sempre o OUTRO lado, que precisa ser avisado.
    const souCorretor = visita.corretor_id === user.id;
    const cliente = visita.comprador ?? visita.cliente_avulso;
    const contraparte = souCorretor ? cliente : visita.corretor;
    if (!contraparte) continue;

    await avisarCancelamento({
      destinatarioNome: contraparte.nome,
      destinatarioEmail: contraparte.email,
      destinatarioTelefone: contraparte.telefone,
      nomeContraparte: souCorretor ? visita.corretor?.nome ?? "o corretor" : cliente?.nome ?? "o cliente",
      dataHoraIso: visita.data_hora,
      motivoExtra: souCorretor
        ? "A conta do corretor foi encerrada."
        : "A conta do cliente foi encerrada.",
    });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ erro: "Não foi possível excluir a conta." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
