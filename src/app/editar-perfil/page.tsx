import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { EditarPerfilForm } from "./form";
import { VincularOrganizacao } from "./vincular-organizacao";
import { ExcluirConta } from "./excluir-conta";

export default async function EditarPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=%2Feditar-perfil");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, telefone, rede_social, foto_url, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "comprador";

  let dadosCorretor: {
    cpf: string | null;
    creci: string;
    bairros_atuacao: string[];
    cidade: string | null;
    organizacao_catalogo_id: string | null;
  } | null = null;

  if (role === "corretor") {
    const { data } = await supabase
      .from("corretor_perfis")
      .select("cpf, creci, bairros_atuacao, cidade, organizacao_catalogo_id")
      .eq("profile_id", user.id)
      .single();
    dadosCorretor = data;
  }

  return (
    <>
      <Nav active="/editar-perfil" />

      <div className="wrap">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Sua conta</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Editar perfil</h1>
          <p className="muted">
            Atualize seus dados de contato e as informações que aparecem para
            quem negocia com você.
          </p>

          <EditarPerfilForm
            userId={user.id}
            emailAtual={user.email ?? ""}
            nomeAtual={profile?.nome ?? ""}
            telefoneAtual={profile?.telefone ?? ""}
            redeSocialAtual={profile?.rede_social ?? ""}
            fotoUrlAtual={profile?.foto_url ?? null}
            role={role}
            dadosCorretor={dadosCorretor}
          />

          {role === "corretor" && (
            <VincularOrganizacao organizacaoAtualId={dadosCorretor?.organizacao_catalogo_id ?? null} />
          )}

          <ExcluirConta />
        </div>
      </div>

      <Footer />
    </>
  );
}
