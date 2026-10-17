import { createAdminClient } from "@/lib/supabase/admin";
import { NpsForm } from "./form";

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

// Página pública de avaliação pós-visita — sem login, o token já é a
// autorização (igual /convite-equipe/[token]). O link vem no e-mail
// disparado por /api/visitas/pedir-nps.
export default async function NpsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  if (!admin) {
    return (
      <div className="wrap" style={{ padding: "64px 0", textAlign: "center" }}>
        <p className="muted">Serviço indisponível no momento.</p>
      </div>
    );
  }

  const { data: visita } = await admin
    .from("visitas")
    .select(
      "id, data_hora, corretor:corretor_id(nome), comprador:comprador_id(nome), cliente_avulso:cliente_avulso_id(nome)",
    )
    .eq("nps_token", token)
    .single();

  if (!visita) {
    return (
      <div className="wrap" style={{ padding: "64px 0", textAlign: "center" }}>
        <p className="muted">Link inválido ou expirado.</p>
      </div>
    );
  }

  const { data: respostaExistente } = await admin
    .from("nps_respostas")
    .select("id")
    .eq("visita_id", visita.id)
    .maybeSingle();

  const visitaTyped = visita as unknown as {
    data_hora: string;
    corretor: { nome: string } | null;
    comprador: { nome: string } | null;
    cliente_avulso: { nome: string } | null;
  };
  const nomeCliente = visitaTyped.comprador?.nome ?? visitaTyped.cliente_avulso?.nome ?? "você";

  return (
    <div className="wrap" style={{ padding: "64px 0", maxWidth: 560, margin: "0 auto" }}>
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        {respostaExistente ? (
          <>
            <span className="badge badge-primary">Obrigado!</span>
            <p className="muted" style={{ marginTop: 12 }}>
              Sua avaliação já foi registrada. Agradecemos o retorno.
            </p>
          </>
        ) : (
          <>
            <span className="eyebrow">Pesquisa de satisfação</span>
            <h1 style={{ fontSize: 22, margin: "8px 0 4px" }}>
              Como foi seu atendimento com {visitaTyped.corretor?.nome ?? "o corretor"}?
            </h1>
            <p className="muted" style={{ marginBottom: 20 }}>
              Visita de {formatoDataHora.format(new Date(visitaTyped.data_hora))}, {nomeCliente}.
            </p>
            <NpsForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
