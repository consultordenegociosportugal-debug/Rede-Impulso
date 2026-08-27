"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { BotoesSocial } from "@/components/botoes-social";
import { destinoPosLogin } from "@/lib/destino-pos-login";
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
  // O /auth/callback devolve o usuário para cá com ?erro=... quando o
  // login social não se completa (janela fechada, provedor desligado).
  const erroLoginSocial = searchParams.get("erro");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
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

    // Mesma decisão usada no retorno do login social (/auth/callback),
    // para os dois caminhos não pararem em telas diferentes.
    router.push(await destinoPosLogin(supabase, data.user.id, { depois }));
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

          {erroLoginSocial && (
            <p
              className="hint mt-16"
              role="alert"
              style={{ color: "var(--coral)" }}
            >
              {erroLoginSocial}
            </p>
          )}

          <form className="card mt-24" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <div
                className="flex between items-center"
                style={{ marginBottom: 6 }}
              >
                <label htmlFor="senha" style={{ marginBottom: 0 }}>
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setVerSenha((v) => !v)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--primary-dark)",
                    cursor: "pointer",
                  }}
                >
                  {verSenha ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <input
                type={verSenha ? "text" : "password"}
                id="senha"
                placeholder="sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
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

          <BotoesSocial depois={depois} />

          <div
            className="mt-24"
            style={{
              borderTop: "1px solid var(--line)",
              paddingTop: 20,
              textAlign: "center",
            }}
          >
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              Ainda não tem conta? Criar é gratuito.
            </p>
            <div
              className="flex gap-8 mt-12"
              style={{ justifyContent: "center", flexWrap: "wrap" }}
            >
              <Link href="/cadastro-cliente" className="btn btn-ghost btn-sm">
                Comprar ou vender
              </Link>
              <Link href="/cadastro-profissional" className="btn btn-ghost btn-sm">
                Sou corretor ou imobiliária
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
