import { createClient } from "@/lib/supabase/server";
import { RaioXForm, type PerfilSalvo, type PrecosReferencia } from "./raio-x-form";

// Raio-X do lucro real (migração 0034). Funciona sem login — o cálculo é
// todo no navegador; logado, o motorista pode salvar os números.
export default async function RaioXPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: radar }] = await Promise.all([
    user
      ? supabase.from("motorista_perfis").select("*").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("motorista_radar")
      .select("precos_referencia")
      .order("data_referencia", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <RaioXForm
      logado={Boolean(user)}
      perfil={perfil as PerfilSalvo | null}
      precos={(radar?.precos_referencia ?? null) as PrecosReferencia | null}
    />
  );
}
