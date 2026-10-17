"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { ConfirmarCodigoEmail } from "@/components/confirmar-codigo-email";
import { Footer } from "@/components/footer";

type Organizacao = {
  id: string;
  nome: string;
  tipo: "imobiliaria" | "construtora";
  cidade: { nome: string; uf: string } | null;
};

const LABEL_TIPO: Record<Organizacao["tipo"], string> = {
  imobiliaria: "Imobiliária",
  construtora: "Construtora",
};

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function traduzErroAuth(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com esse e-mail.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email address") || m.includes("invalid email"))
    return "Confira o e-mail digitado — o formato não foi aceito.";
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas seguidas. Espere alguns segundos e tente de novo.";
  return mensagem;
}

// Cadastro do gestor de uma imobiliária/construtora já cadastrada no
// catálogo (criado pelo admin em /admin/catalogo). Ele escolhe a
// organização na hora do cadastro — sem convite, mesma filosofia
// self-service do corretor em /editar-perfil.
export default function CadastroGestorPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [organizacaoId, setOrganizacaoId] = useState("");
  const [organizacoes, setOrganizacoes] = useState<Organizacao[] | null>(null);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "aguardando_confirmacao" | "logado"
  >("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [emailJaUsado, setEmailJaUsado] = useState(false);

  const primeiroCampo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primeiroCampo.current?.focus();
    const supabase = createClient();
    supabase
      .from("organizacoes_catalogo")
      .select("id, nome, tipo, cidade:cidade_id(nome, uf)")
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (error) return;
        setOrganizacoes((data ?? []) as unknown as Organizacao[]);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !EMAIL_OK.test(email.trim()) || senha.length < 6 || !organizacaoId) return;

    setStatus("loading");
    setErro(null);
    setEmailJaUsado(false);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: new URL("/auth/callback", window.location.origin).toString(),
        data: { role: "gestor", nome },
      },
    });

    if (error) {
      const traduzido = traduzErroAuth(error.message);
      setEmailJaUsado(traduzido.startsWith("Já existe uma conta"));
      setErro(traduzido);
      setStatus("error");
      return;
    }

    if (data.user && data.user.identities?.length === 0) {
      setEmailJaUsado(true);
      setErro("Já existe uma conta com esse e-mail.");
      setStatus("error");
      return;
    }

    setStatus(data.session ? "logado" : "aguardando_confirmacao");
  }

  async function vincularOrganizacao() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("gestor_perfis").insert({
      profile_id: user.id,
      organizacao_catalogo_id: organizacaoId,
    });

    setStatus("logado");
  }

  if (status === "aguardando_confirmacao" || status === "logado") {
    return (
      <>
        <Nav active="/cadastro-gestor" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto" }}>
            <div className="card" style={{ textAlign: "center" }}>
              {status === "logado" && <div className="celebra-icone">✓</div>}
              <span className="badge badge-primary">Cadastro de gestor</span>
              <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>
                {status === "aguardando_confirmacao" ? "Falta só confirmar seu e-mail" : "Tudo pronto!"}
              </h1>
              <p className="muted">
                {status === "aguardando_confirmacao"
                  ? `Enviamos um código de confirmação para ${email}.`
                  : "Sua conta já está ativa."}
              </p>
              {status === "aguardando_confirmacao" && (
                <ConfirmarCodigoEmail email={email} onVerificado={vincularOrganizacao} />
              )}
              {status === "logado" && (
                <Link href="/painel-gestor" className="btn btn-primary btn-sm mt-16">
                  Ir para o meu painel →
                </Link>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav active="/cadastro-gestor" />
      <div className="wrap">
        <div style={{ maxWidth: 480, margin: "48px auto" }}>
          <span className="eyebrow">Cadastro de gestor</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Acompanhe sua equipe de corretores</h1>
          <p className="muted">
            Para gestores de imobiliárias e construtoras já cadastradas na Rede Impulso.
          </p>

          <form className="card mt-16" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="nome">Nome completo</label>
              <input
                ref={primeiroCampo}
                type="text"
                id="nome"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="organizacao">Imobiliária ou construtora</label>
              {organizacoes === null ? (
                <p className="hint">Carregando catálogo…</p>
              ) : (
                <select
                  id="organizacao"
                  value={organizacaoId}
                  onChange={(e) => setOrganizacaoId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {organizacoes.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.nome} ({LABEL_TIPO[org.tipo]}
                      {org.cidade ? ` · ${org.cidade.nome}/${org.cidade.uf}` : ""})
                    </option>
                  ))}
                </select>
              )}
              {organizacoes?.length === 0 && (
                <p className="hint">
                  Nenhuma organização cadastrada ainda — peça pro administrador da Rede
                  Impulso cadastrar a sua em /admin/catalogo.
                </p>
              )}
            </div>

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
              <p className="hint">Você vai receber um código de confirmação nesse endereço.</p>
            </div>

            <div className="field">
              <div className="flex between items-center" style={{ marginBottom: 6 }}>
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
                placeholder="mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <label className="flex items-center gap-8" style={{ fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                required
              />
              <span>
                Li e aceito os{" "}
                <Link href="/termos-de-uso" target="_blank" style={{ textDecoration: "underline" }}>
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" target="_blank" style={{ textDecoration: "underline" }}>
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            {erro && (
              <div className="mt-16" role="alert">
                <p className="hint" style={{ color: "var(--coral)" }}>
                  {erro}
                </p>
                {emailJaUsado && (
                  <Link href="/entrar" className="btn btn-outline btn-sm">
                    Entrar na conta
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block mt-16"
              disabled={status === "loading" || !aceitouTermos}
            >
              {status === "loading" ? "Enviando…" : "Criar cadastro de gestor"}
            </button>
          </form>

          <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>
            Já tem conta?{" "}
            <Link href="/entrar" style={{ textDecoration: "underline" }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
