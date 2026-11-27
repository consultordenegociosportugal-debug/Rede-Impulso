import { redirect } from "next/navigation";
import { createClient } from "./server";

// Trava de acesso repetida em toda página de /admin — centralizada aqui
// pra não ter 8 cópias divergindo com o tempo (uma delas esquecer a
// checagem de is_admin deixaria aquela página aberta pra qualquer
// usuário autenticado).
export async function requireAdmin(depoisPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?depois=${depoisPath}`);
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  return { supabase, user };
}
