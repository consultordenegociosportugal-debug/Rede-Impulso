import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_POR_ROLE } from "@/lib/verificacao";
import { PublicarImovelForm } from "./form";

export default async function PublicarImovelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/publicar-imovel");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let role = profile?.role ?? "comprador";

  if (role === "comprador") {
    await supabase.from("profiles").update({ role: "vendedor" }).eq("id", user.id);
    role = "vendedor";
  }

  const tiposNecessarios = TIPOS_POR_ROLE[role] ?? [];

  if (tiposNecessarios.length > 0) {
    const { count } = await supabase
      .from("documentos_verificacao")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id);

    if (!count) {
      redirect("/verificacao?depois=/publicar-imovel");
    }
  }

  return <PublicarImovelForm />;
}
