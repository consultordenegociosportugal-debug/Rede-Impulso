import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { destinoPosLogin } from "@/lib/destino-pos-login";
import { HomeImobiliaria } from "./home-imobiliaria";

// Quem já tem conta e clica em "Início" (ou cai aqui direto) não deve ver a
// home de marketing — com "Comece agora" e "Sou corretor" apontando de
// volta pro cadastro, dava a impressão de "a conta sumiu e preciso me
// cadastrar de novo". Loga? vai direto pro seu painel.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await destinoPosLogin(supabase, user.id));
  }

  return <HomeImobiliaria />;
}
