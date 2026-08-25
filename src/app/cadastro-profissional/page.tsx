"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { formatarTelefone, formatarCnpj, formatarCreci, formatarInstagram } from "@/lib/mascaras";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

type Papel = "corretor" | "imobiliaria";

const CHECKS = [
  "Selo de avaliação exibido após 1º negócio",
  "Depoimentos aparecem no mural de conquistas",
  "Elegível para sugestão automática por bairro",
];

const TOTAL_PASSOS = 3;

export default function CadastroProfissionalPage() {
  const [passo, setPasso] = useState(1);
  const [papel, setPapel] = useState<Papel>("corretor");
  const [nome, setNome] = useState("");
  const [creci, setCreci] = useState("");
  const [bairros, setBairros] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [redeSocial, setRedeSocial] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "aguardando_confirmacao" | "logado">("idle");
  const [erro, setErro] = useState<string | null>(null);

  function avancar() {
    if (passo === 1) {
      const faltando =
        papel === "corretor" ? !nome || !creci || !bairros : !nome || !cnpj || !nomeFantasia;
      if (faltando) {
        setErro("Preencha os dados obrigatórios para continuar.");
        return;
      }
    }
    if (passo === 2 && (!telefone || !email || !senha)) {
      setErro("Preencha WhatsApp, e-mail e senha para continuar.");
      return;
    }
    setErro(null);
    setPasso((p) => Math.min(p + 1, TOTAL_PASSOS));
  }

  function voltar() {
    setErro(null);
    setPasso((p) => Math.max(p - 1, 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (passo < TOTAL_PASSOS) {
      avancar();
      return;
    }

    setStatus("loading");
    setErro(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data:
          papel === "corretor"
            ? {
                role: "corretor",
                nome,
                telefone,
                rede_social: redeSocial || null,
                creci,
                bairros_atuacao: bairros
                  .split(",")
                  .map((b) => b.trim())
                  .filter(Boolean),
              }
            : {
                role: "imobiliaria",
                nome,
                telefone,
                rede_social: redeSocial || null,
                cnpj,
                nome_fantasia: nomeFantasia,
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
        <Nav active="/cadastro-profissional" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <span className="badge badge-primary">
                Verificação pendente
              </span>
              <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>
                {status === "aguardando_confirmacao"
                  ? "Falta só confirmar seu e-mail"
                  : "Cadastro enviado para análise"}
              </h1>
              <p className="muted">
                {status === "aguardando_confirmacao"
                  ? `Enviamos um link de confirmação para ${email}. Depois disso, analisamos seus dados antes de liberar o perfil público.`
                  : "Analisamos seus dados antes de liberar o perfil público."}
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav active="/cadastro-profissional" />

      <div className="wrap">
        <div style={{ paddingTop: 40 }}>
          <span className="eyebrow">Cadastro profissional</span>
          <h1 style={{ fontSize: 30, margin: "8px 0 4px" }}>
            Corretor autônomo ou imobiliária
          </h1>
          <p className="muted mb-16">
            {passo === 1 && "Quem é você"}
            {passo === 2 && "Contato e acesso"}
            {passo === 3 && "Documentos e confirmação"}
          </p>
          <div className="progresso-etapas" style={{ maxWidth: 320 }}>
            {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
              <div key={i} className={`seg ${i < passo ? "done" : ""}`} />
            ))}
          </div>
        </div>

        <div className={styles.layout}>
          <form className="card mt-16" onSubmit={handleSubmit}>
            {passo === 1 && (
              <>
                <div
                  className="segmented mb-16"
                  role="tablist"
                  aria-label="Tipo de cadastro"
                >
                  <button
                    type="button"
                    className={papel === "corretor" ? "active" : undefined}
                    onClick={() => setPapel("corretor")}
                  >
                    Corretor autônomo
                  </button>
                  <button
                    type="button"
                    className={papel === "imobiliaria" ? "active" : undefined}
                    onClick={() => setPapel("imobiliaria")}
                  >
                    Imobiliária
                  </button>
                </div>

                <div className="field">
                  <label htmlFor="nome">
                    {papel === "corretor" ? "Nome completo" : "Nome do responsável"}
                  </label>
                  <input
                    type="text"
                    id="nome"
                    placeholder="Renata Lima"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>

                {papel === "corretor" ? (
                  <div className="grid grid-2">
                    <div className="field">
                      <label htmlFor="creci">Número do CRECI</label>
                      <input
                        type="text"
                        id="creci"
                        placeholder="7027-MA"
                        value={creci}
                        onChange={(e) => setCreci(formatarCreci(e.target.value))}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="bairro">Bairros de atuação</label>
                      <input
                        type="text"
                        id="bairro"
                        placeholder="Jóquei, Renascença"
                        value={bairros}
                        onChange={(e) => setBairros(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-2">
                    <div className="field">
                      <label htmlFor="cnpj">CNPJ</label>
                      <input
                        type="text"
                        id="cnpj"
                        placeholder="00.000.000/0001-00"
                        value={cnpj}
                        onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
                        pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
                        title="CNPJ no formato 00.000.000/0001-00"
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="nomeFantasia">Nome fantasia</label>
                      <input
                        type="text"
                        id="nomeFantasia"
                        placeholder="Imobiliária Horizonte"
                        value={nomeFantasia}
                        onChange={(e) => setNomeFantasia(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {passo === 2 && (
              <>
                <div className="grid grid-2">
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
                </div>
                <div className="grid grid-2">
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
                </div>
              </>
            )}

            {passo === 3 && (
              <>
                <div className="field">
                  <label>Documentos de verificação</label>
                  <p className="hint" style={{ marginTop: 0 }}>
                    Depois de confirmar seu e-mail e entrar, você envia{" "}
                    {papel === "corretor"
                      ? "seu documento de identidade e comprovante do CRECI"
                      : "o comprovante de CNPJ"}
                    .
                  </p>
                </div>
                <div className="card-flat mb-16" style={{ fontSize: 13.5 }}>
                  <strong>{nome}</strong>
                  <div className="muted">
                    {papel === "corretor" ? `CRECI ${creci}` : nomeFantasia} ·{" "}
                    {email}
                  </div>
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
              </>
            )}

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <div className="flex gap-8 mt-16">
              {passo > 1 && (
                <button type="button" className="btn btn-ghost" onClick={voltar}>
                  ← Voltar
                </button>
              )}
              {passo < TOTAL_PASSOS ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={avancar}
                >
                  Continuar →
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={status === "loading" || !aceitouTermos}
                >
                  {status === "loading"
                    ? "Enviando…"
                    : "Enviar cadastro para verificação"}
                </button>
              )}
            </div>
            {passo === TOTAL_PASSOS && (
              <p className="hint" style={{ textAlign: "center" }}>
                Analisamos documentos, telefone, e-mail e rede social antes de
                liberar o perfil público.
              </p>
            )}
          </form>

          <aside className={styles.previewCard}>
            <div className="card">
              <span className="eyebrow">Prévia do perfil público</span>
              <div className={`${styles.previewHead} mt-12`}>
                <div className="avatar lg">
                  {nome
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0]?.toUpperCase())
                    .join("") || "??"}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{nome || "Seu nome"}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {papel === "corretor"
                      ? `Corretor(a)${creci ? " · " + creci : ""}`
                      : nomeFantasia || "Imobiliária"}
                  </div>
                  <div className="stars mt-8" aria-label="sem avaliações ainda">
                    ★★★★★{" "}
                    <span className="muted mono" style={{ marginLeft: 4 }}>
                      novo
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-16">
                <span className="badge badge-primary">
                  Verificação pendente
                </span>
              </div>
              <div
                className="mt-16"
                style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}
              >
                {CHECKS.map((check) => (
                  <div key={check} className={styles.checkRow}>
                    <span className={styles.dot} />
                    {check}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </>
  );
}
