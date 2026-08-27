"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { BotoesSocial } from "@/components/botoes-social";
import { formatarTelefone, formatarInstagram } from "@/lib/mascaras";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

type Papel = "comprador" | "vendedor";
type Campo = "nome" | "telefone" | "email" | "senha";
type ErrosCampo = Partial<Record<Campo, string>>;

const TOTAL_PASSOS = 2;

const TELEFONE_OK = /^\(\d{2}\)\s?9\s?\d{4}-?\d{4}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PAPEIS: { valor: Papel; titulo: string; descricao: string }[] = [
  {
    valor: "comprador",
    titulo: "Quero comprar",
    descricao: "Ver imóveis, favoritar e conversar com quem anuncia.",
  },
  {
    valor: "vendedor",
    titulo: "Quero vender",
    descricao: "Anunciar meu imóvel e receber propostas.",
  },
];

const TITULO_PASSO = ["Quem é você", "Acesso à sua conta"];

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

export default function CadastroClientePage() {
  const [passo, setPasso] = useState(1);
  const [papel, setPapel] = useState<Papel>("comprador");
  const [nome, setNome] = useState("");
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
  const [imoveisPublicados, setImoveisPublicados] = useState<number | null>(null);

  const primeiroCampo = useRef<HTMLInputElement>(null);
  const jaMontou = useRef(false);

  // Foco no primeiro campo a cada troca de passo (não no carregamento inicial,
  // para não pular por cima da escolha de papel).
  useEffect(() => {
    if (!jaMontou.current) {
      jaMontou.current = true;
      return;
    }
    primeiroCampo.current?.focus();
  }, [passo]);

  // Contagem real de imóveis publicados — mesma consulta honesta da home.
  useEffect(() => {
    let ativo = true;
    createClient()
      .from("imoveis")
      .select("id", { count: "exact", head: true })
      .eq("status", "publicado")
      .then(({ count }) => {
        if (ativo && count) setImoveisPublicados(count);
      });
    return () => {
      ativo = false;
    };
  }, []);

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
      if (!nome.trim()) problemas.nome = "Digite seu nome completo.";
      else if (!nome.trim().includes(" ")) problemas.nome = "Informe nome e sobrenome.";
      if (!telefone) problemas.telefone = "Informe seu WhatsApp com DDD.";
      else if (!TELEFONE_OK.test(telefone))
        problemas.telefone = "Número incompleto — ex: (98) 9 9999-9999.";
    }
    if (alvo === 2) {
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

    const problemas = validarPasso(TOTAL_PASSOS);
    if (Object.keys(problemas).length > 0) {
      setErrosCampo(problemas);
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
        data: {
          role: papel,
          nome,
          telefone,
          rede_social: redeSocial || null,
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
          <div className={styles.passoTopo}>
            <h1 style={{ fontSize: 28, margin: "8px 0 0" }}>
              {passo === 1 ? "Você quer comprar ou vender?" : "Só falta o acesso"}
            </h1>
            <span className={styles.passoContador}>
              Passo {passo} de {TOTAL_PASSOS}
            </span>
          </div>
          <p className="muted">
            {passo === 1
              ? "A documentação pedida muda de acordo com o seu papel no negócio."
              : "Esse e-mail e essa senha serão usados para entrar na Rede Impulso."}
          </p>
          <div className="progresso-etapas mt-16" style={{ maxWidth: 320 }}>
            {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
              <div key={i} className={`seg ${i < passo ? "done" : ""}`} />
            ))}
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            {TITULO_PASSO[passo - 1]}
          </p>

          <form className="card mt-16" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            {passo === 1 && (
              <>
                <div
                  className={`${styles.escolhaGrid} mb-16`}
                  role="radiogroup"
                  aria-label="Você quer comprar ou vender?"
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
                        onChange={() => setPapel(opcao.valor)}
                        className={styles.escolhaInput}
                      />
                      <span className={styles.escolhaTitulo}>{opcao.titulo}</span>
                      <span className={styles.escolhaDesc}>{opcao.descricao}</span>
                    </label>
                  ))}
                </div>

                <div className={`${styles.notice} mb-24`}>
                  <span aria-hidden="true">ℹ️</span>
                  {papel === "comprador" ? (
                    <span>
                      <strong>Como comprador</strong>, você não precisa enviar
                      documento de identidade agora — só quando iniciar uma
                      negociação por um imóvel específico.
                    </span>
                  ) : (
                    <span>
                      <strong>Como vendedor</strong>, depois de entrar você envia
                      seu documento de identidade — é ele que libera a publicação.
                      Fotos e documentos do imóvel entram na hora de anunciar.
                    </span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="nome">Nome completo</label>
                  <input
                    ref={primeiroCampo}
                    type="text"
                    id="nome"
                    placeholder="Seu nome"
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
                  {errosCampo.nome ? (
                    <p className={styles.erroCampo} id="erro-nome">
                      {errosCampo.nome}
                    </p>
                  ) : (
                    <p className="hint">É o nome que aparece para quem negocia com você.</p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="tel">WhatsApp</label>
                  <input
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
                    <p className="hint">
                      É por aqui que a outra parte da negociação fala com você. Não
                      aparece no anúncio.
                    </p>
                  )}
                </div>

                {/* Atalho: quem prefere não criar mais uma senha entra com a
                    conta que já tem. O papel escolhido acima segue junto, e o
                    WhatsApp é pedido depois em /completar-cadastro. */}
                <BotoesSocial
                  papel={papel}
                  bloqueado={!aceitouTermos}
                  avisoBloqueado="Marque o aceite abaixo para continuar com Google ou Facebook."
                />
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
                <div className={styles.resumo}>
                  <span aria-hidden="true">👤</span>
                  <span>
                    <strong>{nome.trim().split(" ")[0]}</strong> · {papel} · {telefone}
                  </span>
                </div>

                <div className="field">
                  <label htmlFor="email">E-mail</label>
                  <input
                    ref={primeiroCampo}
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
                    <p className="hint">Enviamos um link de confirmação para esse endereço.</p>
                  )}
                </div>
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
                  <p className="hint">
                    Ajuda na verificação do seu perfil — você pode preencher depois.
                  </p>
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
                <button type="button" className="btn btn-primary btn-block" onClick={avancar}>
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
                    : papel === "comprador"
                      ? "Criar cadastro de comprador"
                      : "Criar cadastro de vendedor"}
                </button>
              )}
            </div>

            <p className={styles.confianca}>
              Criar conta é gratuito.
              {imoveisPublicados !== null && (
                <>
                  {" "}
                  <span>
                    {imoveisPublicados} imóve{imoveisPublicados === 1 ? "l" : "is"} publicado
                    {imoveisPublicados === 1 ? "" : "s"}
                  </span>{" "}
                  na Rede Impulso.
                </>
              )}
            </p>
          </form>

          <p className={`muted ${styles.rodapeConta}`}>
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
