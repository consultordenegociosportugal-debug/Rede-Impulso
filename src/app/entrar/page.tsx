"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { Footer } from "@/components/footer";

function traduzErro(mensagem: string) {
  if (mensagem === "Invalid login credentials") return "E-mail ou senha incorretos.";
  if (mensagem === "Email not confirmed")
    return "Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.";
  return mensagem;
}

export default function EntrarPage() {
  return (
    <Suspense>
      <EntrarForm />
    </Suspense>
  );
}

function EntrarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const depois = searchParams.get("depois");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErro(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(traduzErro(error.message));
      setStatus("error");
      return;
    }

    if (depois && depois.startsWith("/")) {
      router.push(depois);
      router.refresh();
      return;
    }

    const precisaDocumentos = ["vendedor", "corretor", "imobiliaria", "cartorio"];
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile && precisaDocumentos.includes(profile.role)) {
      const { count } = await supabase
        .from("documentos_verificacao")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", data.user.id);

      if (!count) {
        router.push("/verificacao");
        router.refresh();
        return;
      }
    }

    if (profile?.role === "comprador") {
      router.push("/imoveis");
      router.refresh();
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Nav active="/entrar" />

      <div className="wrap">
        <div style={{ maxWidth: 420, margin: "64px auto" }}>
          <span className="eyebrow">Entrar</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Acesse sua conta</h1>
          <p className="muted">Use o e-mail e a senha do seu cadastro.</p>

          <form className="card mt-24" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="senha">Senha</label>
              <input
                type="password"
                id="senha"
                placeholder="sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block mt-16"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p
            className="muted mt-16"
            style={{ textAlign: "center", fontSize: 13.5 }}
          >
            Ainda não tem conta?{" "}
            <Link href="/cadastro-cliente" style={{ textDecoration: "underline" }}>
              Cadastre-se como cliente
            </Link>{" "}
            ou{" "}
            <Link
              href="/cadastro-profissional"
              style={{ textDecoration: "underline" }}
            >
              como profissional
            </Link>
            .
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}
