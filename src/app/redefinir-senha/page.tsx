"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";
import { destinoPosLogin } from "@/lib/destino-pos-login";

type Sessao = "verificando" | "valida" | "invalida";

// Só chega aqui com sessão válida quem clicou no link do e-mail — o
// /auth/callback troca o código pela sessão antes de redirecionar pra
// cá. Acesso direto (sem link, ou link expirado/já usado) não tem
// sessão nenhuma — por isso a checagem abaixo, em vez de assumir que
// sempre tem alguém logado.
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<Sessao>("verificando");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session ? "valida" : "invalida");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }

    setStatus("loading");
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setErro("Não foi possível trocar a senha agora. Tente de novo.");
      setStatus("error");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const destino = user ? await destinoPosLogin(supabase, user.id) : "/entrar";
    router.push(destino);
    router.refresh();
  }

  return (
    <>
      <Nav active="/entrar" />

      <div className="wrap">
        <div style={{ maxWidth: 420, margin: "64px auto" }}>
          <span className="eyebrow">Recuperar acesso</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Criar nova senha</h1>

          {sessao === "verificando" && <p className="muted mt-16">Carregando…</p>}

          {sessao === "invalida" && (
            <div className="card mt-24" style={{ padding: 20 }}>
              <p style={{ marginTop: 0 }}>
                Esse link de redefinição não é mais válido — ele já foi usado ou expirou.
              </p>
              <Link href="/esqueci-senha" className="btn btn-primary btn-sm">
                Pedir um novo link
              </Link>
            </div>
          )}

          {sessao === "valida" && (
            <form className="card mt-24" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="senha">Nova senha</label>
                <input
                  type="password"
                  id="senha"
                  placeholder="mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="confirmacao">Confirme a nova senha</label>
                <input
                  type="password"
                  id="confirmacao"
                  placeholder="repita a senha"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  autoComplete="new-password"
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
                {status === "loading" ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
