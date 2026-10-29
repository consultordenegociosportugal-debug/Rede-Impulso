"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "enviado" | "error">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?depois=%2Fredefinir-senha`,
    });

    // Não revela se o e-mail existe ou não — padrão de segurança comum
    // pra não virar um jeito de descobrir quem tem conta na Rede Impulso.
    if (error && error.status !== 400) {
      setErro("Não foi possível enviar o link agora. Tente de novo em instantes.");
      setStatus("error");
      return;
    }

    setStatus("enviado");
  }

  return (
    <>
      <Nav active="/entrar" />

      <div className="wrap">
        <div style={{ maxWidth: 420, margin: "64px auto" }}>
          <span className="eyebrow">Recuperar acesso</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Esqueci minha senha</h1>
          <p className="muted">
            Informe o e-mail do seu cadastro — mandamos um link pra você criar uma senha
            nova.
          </p>

          {status === "enviado" ? (
            <div className="card mt-24" style={{ padding: 20 }}>
              <p style={{ margin: 0 }}>
                Se <strong>{email}</strong> tem cadastro na Rede Impulso, enviamos um link
                de redefinição pra esse e-mail. Confira sua caixa de entrada (e o spam).
              </p>
            </div>
          ) : (
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
                {status === "loading" ? "Enviando…" : "Enviar link de redefinição"}
              </button>
            </form>
          )}

          <div
            className="mt-24"
            style={{ borderTop: "1px solid var(--line)", paddingTop: 20, textAlign: "center" }}
          >
            <Link href="/entrar" className="hint">
              ← Voltar pro login
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
