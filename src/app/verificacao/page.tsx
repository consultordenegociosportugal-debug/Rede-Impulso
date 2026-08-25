import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_POR_ROLE } from "@/lib/verificacao";
import { VerificacaoForm } from "./form";
import { Footer } from "@/components/footer";

export default async function VerificacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ depois?: string }>;
}) {
  const { depois } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const destino = `/verificacao${depois ? `?depois=${depois}` : ""}`;
    redirect(`/entrar?depois=${encodeURIComponent(destino)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nome")
    .eq("id", user.id)
    .single();

  const tiposNecessarios = TIPOS_POR_ROLE[profile?.role ?? "comprador"] ?? [];

  const { data: documentos } = await supabase
    .from("documentos_verificacao")
    .select("tipo, status")
    .eq("profile_id", user.id);

  if (tiposNecessarios.length === 0) {
    return (
      <>
        <Nav active="/verificacao" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <span className="badge badge-primary">Sem pendências</span>
              <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>
                Nenhum documento necessário
              </h1>
              <p className="muted">
                Como comprador, você só precisa enviar documentos quando
                iniciar uma negociação por um imóvel específico.
              </p>
              <Link
                href={depois && depois.startsWith("/") ? depois : "/imoveis"}
                className="btn btn-primary btn-sm mt-16"
              >
                {depois && depois.startsWith("/") ? "Continuar" : "Ver imóveis disponíveis"}
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav active="/verificacao" />

      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Verificação</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Envie seus documentos, {profile?.nome?.split(" ")[0]}
          </h1>
          <p className="muted">
            Analisamos os documentos antes de liberar seu perfil público na
            Rede Impulso.
          </p>

          <VerificacaoForm
            userId={user.id}
            tiposNecessarios={tiposNecessarios}
            documentosExistentes={documentos ?? []}
            depois={depois && depois.startsWith("/") ? depois : null}
          />
        </div>
      </div>

      <Footer />
    </>
  );
}
