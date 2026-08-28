import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { EditarPerfilForm } from "./form";

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

  let dadosCorretor: { creci: string; bairros_atuacao: string[] } | null = null;
  let dadosImobiliaria: { cnpj: string; nome_fantasia: string } | null = null;
  let dadosCartorio: { registro_serventia: string } | null = null;

  if (role === "corretor") {
    const { data } = await supabase
      .from("corretor_perfis")
      .select("creci, bairros_atuacao")
      .eq("profile_id", user.id)
      .single();
    dadosCorretor = data;
  } else if (role === "imobiliaria") {
    const { data } = await supabase
      .from("imobiliaria_perfis")
      .select("cnpj, nome_fantasia")
      .eq("profile_id", user.id)
      .single();
    dadosImobiliaria = data;
  } else if (role === "cartorio") {
    const { data } = await supabase
      .from("cartorio_perfis")
      .select("registro_serventia")
      .eq("profile_id", user.id)
      .single();
    dadosCartorio = data;
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
            dadosImobiliaria={dadosImobiliaria}
            dadosCartorio={dadosCartorio}
          />
        </div>
      </div>

      <Footer />
    </>
  );
}
