import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgendarPublicoForm } from "./agendar-publico-form";
import { DistanciaAteEndereco } from "./distancia-ate-endereco";

type PerfilRow = {
  id: string;
  nome: string;
  role: string;
  foto_url: string | null;
  corretor_perfis: {
    organizacao: {
      nome: string;
      endereco: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
  } | null;
};

function iniciais(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "??"
  );
}

// Link público simplificado pra cliente agendar sem criar conta — nome,
// WhatsApp e escolha de dia/horário, só isso. Pedido direto de corretor
// testando o sistema: o link que existia (/perfil-corretor) exige login
// antes de conseguir marcar, o que trava quem só quer marcar rápido pelo
// WhatsApp que o corretor mandou.
export default async function AgendarPublicoPage({
  params,
}: {
  params: Promise<{ corretorId: string }>;
}) {
  const { corretorId } = await params;
  const admin = createAdminClient();

  const { data: perfilData } = admin
    ? await admin
        .from("profiles")
        .select(
          "id, nome, role, foto_url, corretor_perfis!profile_id(organizacao:organizacao_catalogo_id(nome, endereco, latitude, longitude))",
        )
        .eq("id", corretorId)
        .single()
    : { data: null };

  const perfil = perfilData as unknown as PerfilRow | null;

  if (!perfil || perfil.role !== "corretor" || !perfil.corretor_perfis) {
    return (
      <>
        <Nav active="/agendar" />
        <div className="wrap">
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p className="muted">Link inválido ou corretor não encontrado.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const organizacao = perfil.corretor_perfis.organizacao;

  return (
    <>
      <Nav active="/agendar" />
      <div className="wrap">
        <div style={{ maxWidth: 480, margin: "40px auto" }}>
          <div className="card">
            <div className="flex items-center gap-8">
              <div
                className="avatar lg"
                style={
                  perfil.foto_url
                    ? {
                        backgroundImage: `url(${perfil.foto_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                {!perfil.foto_url && iniciais(perfil.nome)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 17 }}>{perfil.nome}</div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  Corretor{organizacao ? ` · ${organizacao.nome}` : ""}
                </div>
              </div>
            </div>

            {organizacao?.endereco && (
              <p className="hint mt-16" style={{ margin: "16px 0 0" }}>
                📍 {organizacao.endereco}
              </p>
            )}
            {organizacao?.latitude != null && organizacao.longitude != null && (
              <DistanciaAteEndereco
                latitudeDestino={organizacao.latitude}
                longitudeDestino={organizacao.longitude}
              />
            )}

            <div className="mt-24">
              <AgendarPublicoForm corretorId={perfil.id} corretorNome={perfil.nome} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
