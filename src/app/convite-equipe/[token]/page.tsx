import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResponderConvite } from "./responder-convite";

type ConviteRow = {
  id: string;
  email: string;
  status: string;
  imobiliaria_id: string;
  profiles: { nome: string } | null;
};

const MENSAGEM_STATUS: Record<string, string> = {
  aceito: "Esse convite já foi aceito.",
  recusado: "Esse convite já foi recusado.",
  cancelado: "Esse convite foi cancelado pela imobiliária.",
};

export default async function ConviteEquipePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data } = admin
    ? await admin
        .from("convites_equipe")
        .select("id, email, status, imobiliaria_id, profiles:imobiliaria_id(nome)")
        .eq("token", token)
        .single()
    : { data: null };
  const convite = data as unknown as ConviteRow | null;

  const { data: imobiliariaPerfil } =
    admin && convite
      ? await admin
          .from("imobiliaria_perfis")
          .select("nome_fantasia")
          .eq("profile_id", convite.imobiliaria_id)
          .single()
      : { data: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nomeImobiliaria = imobiliariaPerfil?.nome_fantasia || convite?.profiles?.nome || "Uma imobiliária";

  return (
    <>
      <Nav active="/convite-equipe" />

      <div className="wrap">
        <div style={{ maxWidth: 480, margin: "64px auto" }}>
          <span className="eyebrow">Convite de equipe</span>

          {!convite ? (
            <div className="card mt-16" style={{ textAlign: "center", padding: "32px 20px" }}>
              <p className="muted" style={{ margin: 0 }}>Convite não encontrado.</p>
            </div>
          ) : convite.status !== "pendente" ? (
            <div className="card mt-16" style={{ textAlign: "center", padding: "32px 20px" }}>
              <p className="muted" style={{ margin: 0 }}>
                {MENSAGEM_STATUS[convite.status] ?? "Esse convite não está mais disponível."}
              </p>
            </div>
          ) : (
            <div className="card mt-16" style={{ padding: "28px 24px" }}>
              <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>
                {nomeImobiliaria} te convidou para a equipe
              </h1>
              <p className="muted">
                Convite enviado para <strong>{convite.email}</strong>. Aceite para entrar na
                equipe de corretores dessa imobiliária na Rede Impulso.
              </p>

              {!user ? (
                <div className="mt-24">
                  <Link
                    href={`/entrar?depois=${encodeURIComponent(`/convite-equipe/${token}`)}`}
                    className="btn btn-primary btn-block"
                  >
                    Entrar para responder
                  </Link>
                  <p className="hint mt-16" style={{ textAlign: "center" }}>
                    Ainda não tem conta de corretor?{" "}
                    <Link href="/cadastro-profissional?papel=corretor">Cadastre-se</Link> e volte
                    nesse mesmo link depois.
                  </p>
                </div>
              ) : (
                <ResponderConvite token={token} emailConvite={convite.email} emailUsuario={user.email ?? ""} />
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
