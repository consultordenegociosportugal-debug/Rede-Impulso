"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { formatarTelefone, formatarInstagram } from "@/lib/mascaras";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

type Papel = "comprador" | "vendedor";

export default function CadastroClientePage() {
  const [papel, setPapel] = useState<Papel>("comprador");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [redeSocial, setRedeSocial] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "aguardando_confirmacao" | "logado">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErro(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          role: papel,
          nome,
          telefone,
          rede_social: redeSocial || null,
        },
      },
    });

    if (error) {
      setErro(error.message);
      setStatus("error");
      return;
    }

    setStatus(data.session ? "logado" : "aguardando_confirmacao");
  }

  if (status === "aguardando_confirmacao" || status === "logado") {
    return (
      <>
        <Nav active="/cadastro-cliente" />
        <div className="wrap">
          <div className={styles.layout}>
            <div className="card mt-24" style={{ textAlign: "center" }}>
              {status === "logado" && <div className="celebra-icone">✓</div>}
              <span className="badge badge-primary">Cadastro criado</span>
              <h1 style={{ fontSize: status === "logado" ? 24 : 22, margin: "12px 0 4px" }}>
                {status === "aguardando_confirmacao"
                  ? "Falta só confirmar seu e-mail"
                  : "Tudo pronto, " + nome.split(" ")[0] + "!"}
              </h1>
              <p className="muted">
                {status === "aguardando_confirmacao"
                  ? `Enviamos um link de confirmação para ${email}. Clique nele para ativar sua conta.`
                  : "Sua conta já está ativa."}
              </p>
              {papel === "vendedor" && (
                <p className="hint">
                  Depois de entrar, você vai enviar seu documento de
                  identidade para liberar a publicação de imóveis.
                </p>
              )}
              {status === "logado" && papel === "comprador" && (
                <Link href="/imoveis" className="btn btn-primary btn-sm mt-16">
                  Ver imóveis disponíveis →
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
      <Nav active="/cadastro-cliente" />

      <div className="wrap">
        <div className={styles.layout}>
          <span className="eyebrow">Cadastro de cliente</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Você quer comprar ou vender?
          </h1>
          <p className="muted">
            A documentação pedida muda de acordo com o seu papel no negócio.
          </p>
          <div className="segmented mt-16">
            <button
              type="button"
              className={papel === "comprador" ? "active" : undefined}
              onClick={() => setPapel("comprador")}
            >
              Comprador
            </button>
            <button
              type="button"
              className={papel === "vendedor" ? "active" : undefined}
              onClick={() => setPapel("vendedor")}
            >
              Vendedor
            </button>
          </div>

          {papel === "comprador" && (
            <div className={`${styles.notice} mt-24`}>
              <span>ℹ️</span>
              <span>
                <strong>Como comprador</strong>, você não precisa enviar
                documento de identidade agora — só quando iniciar uma
                negociação por um imóvel específico.
              </span>
            </div>
          )}

          <form className="card mt-24" onSubmit={handleSubmit}>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="nome">Nome completo</label>
                <input
                  type="text"
                  id="nome"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="tel">WhatsApp</label>
                <input
                  type="tel"
                  id="tel"
                  placeholder="(98) 9 9999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  pattern="\(\d{2}\)\s?9\s?\d{4}-?\d{4}"
                  title="Celular com DDD, ex: (98) 9 9999-9999"
                  required
                />
              </div>
            </div>
            <div className="grid grid-2">
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
                  placeholder="mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="rede">
                Rede social{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <input
                type="text"
                id="rede"
                placeholder="@seuinstagram"
                value={redeSocial}
                onChange={(e) => setRedeSocial(formatarInstagram(e.target.value))}
              />
            </div>

            <label className="flex gap-8 items-center" style={{ fontSize: 13, fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                required
                style={{ width: "auto" }}
              />
              Li e aceito os{" "}
              <Link href="/termos-de-uso" target="_blank" style={{ textDecoration: "underline" }}>
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" style={{ textDecoration: "underline" }}>
                Política de Privacidade
              </Link>
            </label>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block mt-16"
              disabled={status === "loading" || !aceitouTermos}
            >
              {status === "loading"
                ? "Enviando…"
                : papel === "comprador"
                  ? "Criar cadastro de comprador"
                  : "Criar cadastro de vendedor"}
            </button>
          </form>

          {papel === "vendedor" && (
            <p className="hint mt-16" style={{ textAlign: "center" }}>
              Depois de confirmar seu e-mail e entrar, você envia seu
              documento de identidade. Fotos e documentos do imóvel entram
              na hora de publicar o anúncio.
            </p>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
