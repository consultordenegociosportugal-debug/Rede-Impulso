"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { BotoesSocial } from "@/components/botoes-social";
import { formatarTelefone, formatarCnpj, formatarCreci, formatarInstagram } from "@/lib/mascaras";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

type Papel = "corretor" | "imobiliaria";
type Campo =
  | "nome"
  | "creci"
  | "bairros"
  | "cnpj"
  | "nomeFantasia"
  | "telefone"
  | "email"
  | "senha";
type ErrosCampo = Partial<Record<Campo, string>>;

const CHECKS = [
  "Selo de avaliação exibido após 1º negócio",
  "Depoimentos aparecem no mural de conquistas",
  "Elegível para sugestão automática por bairro",
];

const TOTAL_PASSOS = 3;

const TELEFONE_OK = /^\(\d{2}\)\s?9\s?\d{4}-?\d{4}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CNPJ_OK = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const PAPEIS: { valor: Papel; titulo: string; descricao: string }[] = [
  {
    valor: "corretor",
    titulo: "Corretor autônomo",
    descricao: "Trabalho por conta própria, com CRECI no meu nome.",
  },
  {
    valor: "imobiliaria",
    titulo: "Imobiliária",
    descricao: "Represento uma empresa com CNPJ e equipe.",
  },
];

const TITULO_PASSO = ["Quem é você", "Contato e acesso", "Documentos e confirmação"];

/** Mensagens do Supabase chegam em inglês — aqui viram texto acionável em pt-BR. */
function traduzErroAuth(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com esse e-mail.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("password") && m.includes("weak"))
    return "Escolha uma senha mais forte — misture letras e números.";
  if (m.includes("unable to validate email address") || m.includes("invalid email"))
    return "Confira o e-mail digitado — o formato não foi aceito.";
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas seguidas. Espere alguns segundos e tente de novo.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.";
  return mensagem;
}

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
  const [verSenha, setVerSenha] = useState(false);
  const [redeSocial, setRedeSocial] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "aguardando_confirmacao" | "logado">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [emailJaUsado, setEmailJaUsado] = useState(false);
  const [errosCampo, setErrosCampo] = useState<ErrosCampo>({});

  const primeiroCampo = useRef<HTMLInputElement>(null);
  const jaMontou = useRef(false);

  // Foco no primeiro campo a cada troca de passo (não no carregamento inicial,
  // para não pular por cima da escolha de tipo de cadastro).
  useEffect(() => {
    if (!jaMontou.current) {
      jaMontou.current = true;
      return;
    }
    primeiroCampo.current?.focus();
  }, [passo]);

  function limparErroDe(campo: Campo) {
    setErrosCampo((atuais) => {
      if (!atuais[campo]) return atuais;
      const proximos = { ...atuais };
      delete proximos[campo];
      return proximos;
    });
  }

  function validarPasso(alvo: number): ErrosCampo {
    const problemas: ErrosCampo = {};
    if (alvo === 1) {
      if (!nome.trim())
        problemas.nome =
          papel === "corretor" ? "Digite seu nome completo." : "Digite o nome do responsável.";
      else if (!nome.trim().includes(" ")) problemas.nome = "Informe nome e sobrenome.";

      if (papel === "corretor") {
        if (!creci.trim()) problemas.creci = "Informe o número do seu CRECI.";
        else if (!/\d{3}/.test(creci)) problemas.creci = "CRECI incompleto — ex: 7027-MA.";
        if (!bairros.trim()) problemas.bairros = "Informe ao menos um bairro onde você atua.";
      } else {
        if (!cnpj.trim()) problemas.cnpj = "Informe o CNPJ da imobiliária.";
        else if (!CNPJ_OK.test(cnpj)) problemas.cnpj = "CNPJ incompleto — são 14 dígitos.";
        if (!nomeFantasia.trim()) problemas.nomeFantasia = "Informe o nome fantasia.";
      }
    }
    if (alvo === 2) {
      if (!telefone) problemas.telefone = "Informe seu WhatsApp com DDD.";
      else if (!TELEFONE_OK.test(telefone))
        problemas.telefone = "Número incompleto — ex: (98) 9 9999-9999.";
      if (!email.trim()) problemas.email = "Informe seu e-mail.";
      else if (!EMAIL_OK.test(email.trim()))
        problemas.email = "Esse e-mail parece incompleto — confira o endereço.";
      if (!senha) problemas.senha = "Escolha uma senha.";
      else if (senha.length < 6) problemas.senha = "A senha precisa ter pelo menos 6 caracteres.";
    }
    return problemas;
  }

  function avancar() {
    const problemas = validarPasso(passo);
    if (Object.keys(problemas).length > 0) {
      setErrosCampo(problemas);
      return;
    }
    setErrosCampo({});
    setErro(null);
    setPasso((p) => Math.min(p + 1, TOTAL_PASSOS));
  }

  function voltar() {
    setErro(null);
    setErrosCampo({});
    setPasso((p) => Math.max(p - 1, 1));
  }

  // Nos passos intermediários o formulário não tem botão de submit, então o
  // Enter não dispara nada sozinho — aqui ele avança o passo, como nos grandes
  // marketplaces. O guard em handleSubmit continua protegendo o envio.
  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || passo >= TOTAL_PASSOS) return;
    const alvo = e.target as HTMLElement;
    if (alvo.tagName !== "INPUT" || (alvo as HTMLInputElement).type === "checkbox") return;
    e.preventDefault();
    avancar();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Enter num campo intermediário avança o passo em vez de enviar o cadastro.
    if (passo < TOTAL_PASSOS) {
      avancar();
      return;
    }

    setStatus("loading");
    setErro(null);
    setEmailJaUsado(false);

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
      const traduzido = traduzErroAuth(error.message);
      setEmailJaUsado(traduzido.startsWith("Já existe uma conta"));
      setErro(traduzido);
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
          <div className={styles.passoTopo}>
            <h1 style={{ fontSize: 30, margin: "8px 0 4px" }}>
              Corretor autônomo ou imobiliária
            </h1>
            <span className={styles.passoContador}>
              Passo {passo} de {TOTAL_PASSOS}
            </span>
          </div>
          <p className="muted mb-16">{TITULO_PASSO[passo - 1]}</p>
          <div className="progresso-etapas" style={{ maxWidth: 320 }}>
            {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
              <div key={i} className={`seg ${i < passo ? "done" : ""}`} />
            ))}
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.coluna}>
          <form className="card mt-16" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            {passo === 1 && (
              <>
                <div
                  className={`${styles.escolhaGrid} mb-16`}
                  role="radiogroup"
                  aria-label="Tipo de cadastro"
                >
                  {PAPEIS.map((opcao) => (
                    <label
                      key={opcao.valor}
                      className={`${styles.escolha} ${papel === opcao.valor ? styles.escolhaAtiva : ""}`}
                    >
                      <input
                        type="radio"
                        name="papel"
                        value={opcao.valor}
                        checked={papel === opcao.valor}
                        onChange={() => {
                          setPapel(opcao.valor);
                          setErrosCampo({});
                        }}
                        className={styles.escolhaInput}
                      />
                      <span className={styles.escolhaTitulo}>{opcao.titulo}</span>
                      <span className={styles.escolhaDesc}>{opcao.descricao}</span>
                    </label>
                  ))}
                </div>

                <div className={`${styles.notice} mb-24`}>
                  <span aria-hidden="true">ℹ️</span>
                  {papel === "corretor" ? (
                    <span>
                      <strong>Corretor autônomo</strong>: o CRECI e os bairros que
                      você informar aparecem no seu perfil público — são eles que
                      fazem a Rede sugerir você para imóveis da região.
                    </span>
                  ) : (
                    <span>
                      <strong>Imobiliária</strong>: a conta fica no CNPJ da empresa,
                      e o nome fantasia é o que identifica vocês no perfil público.
                    </span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="nome">
                    {papel === "corretor" ? "Nome completo" : "Nome do responsável"}
                  </label>
                  <input
                    ref={primeiroCampo}
                    type="text"
                    id="nome"
                    placeholder="Renata Lima"
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      limparErroDe("nome");
                    }}
                    className={errosCampo.nome ? styles.campoInvalido : undefined}
                    aria-invalid={errosCampo.nome ? true : undefined}
                    aria-describedby={errosCampo.nome ? "erro-nome" : undefined}
                    required
                  />
                  {errosCampo.nome && (
                    <p className={styles.erroCampo} id="erro-nome">
                      {errosCampo.nome}
                    </p>
                  )}
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
                        onChange={(e) => {
                          setCreci(formatarCreci(e.target.value));
                          limparErroDe("creci");
                        }}
                        className={errosCampo.creci ? styles.campoInvalido : undefined}
                        aria-invalid={errosCampo.creci ? true : undefined}
                        aria-describedby={errosCampo.creci ? "erro-creci" : undefined}
                        required
                      />
                      {errosCampo.creci ? (
                        <p className={styles.erroCampo} id="erro-creci">
                          {errosCampo.creci}
                        </p>
                      ) : (
                        <p className="hint">Número e sigla do estado, como no seu registro.</p>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="bairro">Bairros de atuação</label>
                      <input
                        type="text"
                        id="bairro"
                        placeholder="Jóquei, Renascença"
                        value={bairros}
                        onChange={(e) => {
                          setBairros(e.target.value);
                          limparErroDe("bairros");
                        }}
                        className={errosCampo.bairros ? styles.campoInvalido : undefined}
                        aria-invalid={errosCampo.bairros ? true : undefined}
                        aria-describedby={errosCampo.bairros ? "erro-bairro" : undefined}
                        required
                      />
                      {errosCampo.bairros ? (
                        <p className={styles.erroCampo} id="erro-bairro">
                          {errosCampo.bairros}
                        </p>
                      ) : (
                        <p className="hint">Separe por vírgula. Dá para ajustar depois.</p>
                      )}
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
                        onChange={(e) => {
                          setCnpj(formatarCnpj(e.target.value));
                          limparErroDe("cnpj");
                        }}
                        pattern="\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}"
                        title="CNPJ no formato 00.000.000/0001-00"
                        className={errosCampo.cnpj ? styles.campoInvalido : undefined}
                        aria-invalid={errosCampo.cnpj ? true : undefined}
                        aria-describedby={errosCampo.cnpj ? "erro-cnpj" : undefined}
                        required
                      />
                      {errosCampo.cnpj ? (
                        <p className={styles.erroCampo} id="erro-cnpj">
                          {errosCampo.cnpj}
                        </p>
                      ) : (
                        <p className="hint">Usamos para conferir o registro da empresa.</p>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="nomeFantasia">Nome fantasia</label>
                      <input
                        type="text"
                        id="nomeFantasia"
                        placeholder="Imobiliária Horizonte"
                        value={nomeFantasia}
                        onChange={(e) => {
                          setNomeFantasia(e.target.value);
                          limparErroDe("nomeFantasia");
                        }}
                        className={errosCampo.nomeFantasia ? styles.campoInvalido : undefined}
                        aria-invalid={errosCampo.nomeFantasia ? true : undefined}
                        aria-describedby={errosCampo.nomeFantasia ? "erro-fantasia" : undefined}
                        required
                      />
                      {errosCampo.nomeFantasia ? (
                        <p className={styles.erroCampo} id="erro-fantasia">
                          {errosCampo.nomeFantasia}
                        </p>
                      ) : (
                        <p className="hint">É esse nome que aparece no perfil público.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Atalho para quem prefere não criar mais uma senha. O CRECI
                    ou o CNPJ não viajam com o login social, então esses dados
                    são pedidos de novo em /completar-cadastro — por isso o
                    aviso logo abaixo. */}
                <BotoesSocial
                  papel={papel}
                  bloqueado={!aceitouTermos}
                  avisoBloqueado="Marque o aceite abaixo para continuar com Google ou Facebook."
                />
                <p className="hint" style={{ textAlign: "center" }}>
                  Entrando com Google ou Facebook, você confirma{" "}
                  {papel === "corretor" ? "CRECI e bairros" : "CNPJ e nome fantasia"}{" "}
                  na tela seguinte, e depois envia os documentos de verificação.
                </p>
                <label className={styles.termos} style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                    className={styles.termosCheck}
                  />
                  <span>
                    Li e aceito os{" "}
                    <Link
                      href="/termos-de-uso"
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      style={{ textDecoration: "underline" }}
                    >
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      href="/privacidade"
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      style={{ textDecoration: "underline" }}
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>
              </>
            )}

            {passo === 2 && (
              <>
                <div className="grid grid-2">
                  <div className="field">
                    <label htmlFor="tel">WhatsApp</label>
                    <input
                      ref={primeiroCampo}
                      type="tel"
                      id="tel"
                      placeholder="(98) 9 9999-9999"
                      value={telefone}
                      onChange={(e) => {
                        setTelefone(formatarTelefone(e.target.value));
                        limparErroDe("telefone");
                      }}
                      pattern="\(\d{2}\)\s?9\s?\d{4}-?\d{4}"
                      title="Celular com DDD, ex: (98) 9 9999-9999"
                      className={errosCampo.telefone ? styles.campoInvalido : undefined}
                      aria-invalid={errosCampo.telefone ? true : undefined}
                      aria-describedby={errosCampo.telefone ? "erro-tel" : undefined}
                      required
                    />
                    {errosCampo.telefone ? (
                      <p className={styles.erroCampo} id="erro-tel">
                        {errosCampo.telefone}
                      </p>
                    ) : (
                      <p className="hint">Entra na verificação do seu cadastro.</p>
                    )}
                  </div>
                  <div className="field">
                    <label htmlFor="email">E-mail</label>
                    <input
                      type="email"
                      id="email"
                      placeholder="voce@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        limparErroDe("email");
                        setEmailJaUsado(false);
                      }}
                      className={errosCampo.email ? styles.campoInvalido : undefined}
                      aria-invalid={errosCampo.email ? true : undefined}
                      aria-describedby={errosCampo.email ? "erro-email" : undefined}
                      autoComplete="email"
                      required
                    />
                    {errosCampo.email ? (
                      <p className={styles.erroCampo} id="erro-email">
                        {errosCampo.email}
                      </p>
                    ) : (
                      <p className="hint">Enviamos o link de confirmação para cá.</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="field">
                    <div className={styles.labelLinha}>
                      <label htmlFor="senha">Senha</label>
                      <button
                        type="button"
                        className={styles.verSenha}
                        onClick={() => setVerSenha((v) => !v)}
                      >
                        {verSenha ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                    <input
                      type={verSenha ? "text" : "password"}
                      id="senha"
                      placeholder="mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => {
                        setSenha(e.target.value);
                        limparErroDe("senha");
                      }}
                      className={errosCampo.senha ? styles.campoInvalido : undefined}
                      aria-invalid={errosCampo.senha ? true : undefined}
                      aria-describedby={errosCampo.senha ? "erro-senha" : undefined}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    {errosCampo.senha && (
                      <p className={styles.erroCampo} id="erro-senha">
                        {errosCampo.senha}
                      </p>
                    )}
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
                    <p className="hint">Acelera a verificação — dá para preencher depois.</p>
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
                  <div className="muted">{telefone}</div>
                </div>
                <label className={styles.termos}>
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                    required
                    className={styles.termosCheck}
                  />
                  <span>
                    Li e aceito os{" "}
                    <Link
                      href="/termos-de-uso"
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      style={{ textDecoration: "underline" }}
                    >
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      href="/privacidade"
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      style={{ textDecoration: "underline" }}
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>
              </>
            )}

            {erro && (
              <div className={styles.erroBloco} role="alert">
                <span>{erro}</span>
                {emailJaUsado && (
                  <Link href="/entrar" className="btn btn-outline btn-sm">
                    Entrar na conta
                  </Link>
                )}
              </div>
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

          <p className={`muted ${styles.rodapeConta}`}>
            Já tem conta?{" "}
            <Link href="/entrar" style={{ textDecoration: "underline" }}>
              Entrar
            </Link>
          </p>
          </div>

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
