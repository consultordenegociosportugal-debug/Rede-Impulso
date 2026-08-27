import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { caminhoInternoSeguro, destinoPosLogin } from "@/lib/destino-pos-login";
import { CompletarCadastroForm } from "./form";

/**
 * Passo de fechamento do cadastro criado por login social.
 *
 * Google e Facebook devolvem nome, e-mail e avatar — nunca telefone e
 * nunca o papel na negociação. O trigger `handle_new_user` preenche o
 * que dá e deixa `telefone` nulo; é essa ausência que traz o usuário
 * para cá logo depois do /auth/callback.
 */
export default async function CompletarCadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ depois?: string; papel?: string }>;
}) {
  const { depois, papel } = await searchParams;
  const destinoDepois = caminhoInternoSeguro(depois);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const alvo = `/completar-cadastro${destinoDepois ? `?depois=${encodeURIComponent(destinoDepois)}` : ""}`;
    redirect(`/entrar?depois=${encodeURIComponent(alvo)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nome, telefone")
    .eq("id", user.id)
    .single();

  // Já completou (ou entrou por e-mail/senha e nunca precisou disso):
  // não faz sentido segurar o usuário aqui.
  if (profile?.telefone?.trim()) {
    redirect(await destinoPosLogin(supabase, user.id, { depois: destinoDepois }));
  }

  return (
    <>
      <Nav active="/completar-cadastro" />

      <div className="wrap">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Falta pouco</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Complete seu cadastro</h1>
          <p className="muted">
            Sua conta já está criada. Só precisamos do seu WhatsApp e do seu
            papel na negociação para liberar o resto da Rede Impulso.
          </p>

          <CompletarCadastroForm
            nomeAtual={profile?.nome ?? ""}
            emailAtual={user.email ?? ""}
            roleAtual={profile?.role ?? "comprador"}
            papelSugerido={papel ?? null}
            depois={destinoDepois}
          />
        </div>
      </div>

      <Footer />
    </>
  );
}
