"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { BotoesSocial } from "@/components/botoes-social";
import { formatarTelefone, formatarCreci, formatarInstagram, formatarCpf } from "@/lib/mascaras";
import { cpfValido } from "@/lib/validacoes";
import { ehMaiorDeIdade, dataMaximaNascimento } from "@/lib/idade";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";
import { ConfirmarCodigoEmail } from "@/components/confirmar-codigo-email";
import { ConfirmarCodigoTelefone } from "@/components/confirmar-codigo-telefone";
import { BairrosInput } from "@/components/bairros-input";
import { CidadesEstadosInput } from "@/components/cidades-estados-input";

type Campo =
  | "nome"
  | "cpf"
  | "creci"
  | "bairros"
  | "termos"
  | "telefone"
  | "dataNascimento"
  | "email"
  | "senha";
type ErrosCampo = Partial<Record<Campo, string>>;

const TOTAL_PASSOS = 2;

const TELEFONE_OK = /^\(\d{2}\)\s?9\s?\d{4}-?\d{4}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TITULO_PASSO = ["Quem é você", "Contato e acesso"];

// Pra onde rolar/focar quando a validação do passo barra o avanço — sem
// isso o único aviso era um texto pequeno embaixo do campo, fácil de não
// perceber (relatado como "clico em Continuar e não acontece nada").
const CAMPO_ID: Record<Campo, string> = {
  nome: "nome",
  cpf: "cpf",
  creci: "creci",
  bairros: "bairro",
  termos: "termos",
  telefone: "tel",
  dataNascimento: "dataNascimento",
  email: "email",
  senha: "senha",
};

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
  // CPF/CRECI únicos (migração 0071) — handle_new_user cria o
  // corretor_perfis dentro do próprio signUp; se a constraint barrar,
  // o Supabase pode repassar o texto cru do Postgres ou só um erro
  // genérico de banco. Cobre os dois casos com uma mensagem acionável.
  if (m.includes("corretor_perfis_cpf_key")) return "Esse CPF já está cadastrado em outra conta.";
  if (m.includes("corretor_perfis_creci_key"))
    return "Esse CRECI já está cadastrado em outra conta.";
  if (m.includes("database error saving new user"))
    return "Não foi possível concluir o cadastro — confira se o CPF e o CRECI já não estão em uso em outra conta.";
  return mensagem;
}

export default function CadastroProfissionalPage() {
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [creci, setCreci] = useState("");
  const [bairros, setBairros] = useState<string[]>([]);
  const [cidadesAtuacao, setCidadesAtuacao] = useState<string[]>([]);
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [redeSocial, setRedeSocial] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "aguardando_confirmacao" | "confirmando_telefone" | "logado"
  >("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [emailJaUsado, setEmailJaUsado] = useState(false);
  const [errosCampo, setErrosCampo] = useState<ErrosCampo>({});
  const [verificandoDuplicidade, setVerificandoDuplicidade] = useState(false);

  const primeiroCampo = useRef<HTMLInputElement>(null);
  const jaMontou = useRef(false);

  // Foco no primeiro campo a cada troca de passo (não no carregamento inicial).
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
      if (!nome.trim()) problemas.nome = "Digite seu nome completo.";
      else if (!nome.trim().includes(" ")) problemas.nome = "Informe nome e sobrenome.";

      if (!cpf.trim()) problemas.cpf = "Informe seu CPF.";
      else if (!cpfValido(cpf)) problemas.cpf = "Esse CPF não é válido — confira os números.";

      if (!creci.trim()) problemas.creci = "Informe o número do seu CRECI.";
      else if (!/\d{3}/.test(creci)) problemas.creci = "CRECI incompleto — ex: 7027-MA.";
      if (bairros.length === 0) problemas.bairros = "Informe ao menos um bairro onde você atua.";

      if (!aceitouTermos)
        problemas.termos = "Marque o aceite dos Termos de Uso e da Política de Privacidade para continuar.";
    }
    if (alvo === 2) {
      if (!telefone) problemas.telefone = "Informe seu WhatsApp com DDD.";
      else if (!TELEFONE_OK.test(telefone))
        problemas.telefone = "Número incompleto — ex: (98) 9 9999-9999.";
      if (!dataNascimento) problemas.dataNascimento = "Informe sua data de nascimento.";
      else if (!ehMaiorDeIdade(dataNascimento))
        problemas.dataNascimento = "Você precisa ter 18 anos ou mais para criar uma conta.";
      if (!email.trim()) problemas.email = "Informe seu e-mail.";
      else if (!EMAIL_OK.test(email.trim()))
        problemas.email = "Esse e-mail parece incompleto — confira o endereço.";
      if (!senha) problemas.senha = "Escolha uma senha.";
      else if (senha.length < 6) problemas.senha = "A senha precisa ter pelo menos 6 caracteres.";
    }
    return problemas;
  }

  function mostrarErroDeCampo(problemas: ErrosCampo) {
    setErrosCampo(problemas);
    setErro("Confira os campos destacados abaixo antes de continuar.");
    const campoComErro = Object.keys(problemas)[0] as Campo;
    const elementoId = CAMPO_ID[campoComErro];
    requestAnimationFrame(() => {
      const el = document.getElementById(elementoId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
    });
  }

  async function avancar() {
    const problemas = validarPasso(passo);
    if (Object.keys(problemas).length > 0) {
      mostrarErroDeCampo(problemas);
      return;
    }

    // CPF/CRECI são únicos entre corretores (migração 0071). Checar aqui,
    // antes do signUp, evita depender da mensagem de erro que o Supabase
    // Auth devolve pra violação de unique constraint — que vem mascarada
    // como um erro genérico de banco, sem dizer qual campo bateu.
    if (passo === 1) {
      setVerificandoDuplicidade(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("cpf_creci_disponiveis", {
        p_cpf: cpf.replace(/\D/g, ""),
        p_creci: creci,
      });
      setVerificandoDuplicidade(false);

      if (!error && data) {
        const duplicidade: ErrosCampo = {};
        if (!data.cpf_disponivel) duplicidade.cpf = "Esse CPF já está cadastrado em outra conta.";
        if (!data.creci_disponivel)
          duplicidade.creci = "Esse CRECI já está cadastrado em outra conta.";
        if (Object.keys(duplicidade).length > 0) {
          mostrarErroDeCampo(duplicidade);
          return;
        }
      }
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
  // Enter não dispara nada sozinho — aqui ele avança o passo. O guard em
  // handleSubmit continua protegendo o envio.
  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || passo >= TOTAL_PASSOS) return;
    const alvo = e.target as HTMLElement;
    if (alvo.tagName !== "INPUT" || (alvo as HTMLInputElement).type === "checkbox") return;
    e.preventDefault();
    avancar();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
        // Sem isso, o link do e-mail de confirmação cai no Site URL
        // configurado no painel do Supabase — que pode estar errado
        // (ex.: ainda apontando pra localhost de um ambiente de teste).
        // Setar aqui explicitamente garante o domínio certo sempre.
        emailRedirectTo: new URL("/auth/callback", window.location.origin).toString(),
        data: {
          role: "corretor",
          nome,
          telefone,
          data_nascimento: dataNascimento,
          rede_social: redeSocial || null,
          cpf: cpf.replace(/\D/g, ""),
          creci,
          bairros_atuacao: bairros,
          cidades_atuacao: cidadesAtuacao,
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

    // Conta já existe e confirmada: o Supabase não erra aqui (evita
    // enumeração de e-mail) — só devolve um usuário sem identidades novas.
    // Sem este check a tela dizia "enviamos um código" e nada era enviado.
    if (data.user && data.user.identities?.length === 0) {
      setEmailJaUsado(true);
      setErro("Já existe uma conta com esse e-mail.");
      setStatus("error");
      return;
    }

    setStatus(data.session ? "logado" : "aguardando_confirmacao");
  }

  if (status === "aguardando_confirmacao" || status === "confirmando_telefone" || status === "logado") {
    return (
      <>
        <Nav active="/cadastro-profissional" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto" }}>
            <div className="card" style={{ textAlign: "center" }}>
              {status === "logado" && <div className="celebra-icone">✓</div>}
              <span className="badge badge-primary">Cadastro criado</span>
              <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>
                {status === "aguardando_confirmacao"
                  ? "Falta só confirmar seu e-mail"
                  : status === "confirmando_telefone"
                    ? "Agora confirme seu WhatsApp"
                    : "Tudo pronto!"}
              </h1>
              <p className="muted">
                {status === "aguardando_confirmacao"
                  ? `Enviamos um código de confirmação para ${email}.`
                  : status === "confirmando_telefone"
                    ? "Assim quem te procurar sabe que o número é de verdade."
                    : "Sua conta já está ativa — você já pode cadastrar clientes e agendar visitas."}
              </p>
              {status === "aguardando_confirmacao" && (
                <ConfirmarCodigoEmail
                  email={email}
                  onVerificado={() => setStatus("confirmando_telefone")}
                />
              )}
              {status === "confirmando_telefone" && (
                <ConfirmarCodigoTelefone
                  telefone={telefone}
                  onVerificado={() => setStatus("logado")}
                  onPular={() => setStatus("logado")}
                />
              )}
              {status === "logado" && (
                <Link href="/painel-negocios" className="btn btn-primary btn-sm mt-16">
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
      <Nav active="/cadastro-profissional" />

      <div className="wrap">
        <div style={{ paddingTop: 40 }}>
          <span className="eyebrow">Cadastro profissional</span>
          <div className={styles.passoTopo}>
            <h1 style={{ fontSize: 30, margin: "8px 0 4px" }}>Cadastro de corretor</h1>
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
                <div className={`${styles.notice} mb-24`}>
                  <span aria-hidden="true">ℹ️</span>
                  <span>
                    O CRECI e os bairros que você informar aparecem no seu perfil
                    público — são eles que fazem a Rede sugerir você pros clientes
                    da região.
                  </span>
                </div>

                <div className="field">
                  <label htmlFor="nome">Nome completo</label>
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

                <div className="field">
                  <label htmlFor="cpf">CPF</label>
                  <input
                    type="text"
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => {
                      setCpf(formatarCpf(e.target.value));
                      limparErroDe("cpf");
                    }}
                    className={errosCampo.cpf ? styles.campoInvalido : undefined}
                    aria-invalid={errosCampo.cpf ? true : undefined}
                    aria-describedby={errosCampo.cpf ? "erro-cpf" : undefined}
                    required
                  />
                  {errosCampo.cpf && (
                    <p className={styles.erroCampo} id="erro-cpf">
                      {errosCampo.cpf}
                    </p>
                  )}
                </div>

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
                    <BairrosInput
                      id="bairro"
                      value={bairros}
                      onChange={(v) => {
                        setBairros(v);
                        limparErroDe("bairros");
                      }}
                      placeholder="Jóquei, Renascença…"
                    />
                    {errosCampo.bairros ? (
                      <p className={styles.erroCampo} id="erro-bairro">
                        {errosCampo.bairros}
                      </p>
                    ) : (
                      <p className="hint">Digite e aperte Enter. Dá para ajustar depois.</p>
                    )}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="cidade">
                    Cidades ou estados de atuação{" "}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      (opcional)
                    </span>
                  </label>
                  <CidadesEstadosInput
                    id="cidade"
                    value={cidadesAtuacao}
                    onChange={setCidadesAtuacao}
                  />
                  <p className="hint">
                    Ajuda quem está procurando um profissional perto de onde mora. Tem CRECI em
                    mais de um estado? Pode adicionar vários.
                  </p>
                </div>

                <BotoesSocial
                  papel="corretor"
                  bloqueado={!aceitouTermos}
                  avisoBloqueado="Marque o aceite abaixo para continuar com Google ou Facebook."
                />
                <p className="hint" style={{ textAlign: "center" }}>
                  Entrando com Google ou Facebook, você confirma CRECI e bairros na
                  tela seguinte.
                </p>
                <label className={styles.termos} style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    id="termos"
                    checked={aceitouTermos}
                    onChange={(e) => {
                      setAceitouTermos(e.target.checked);
                      limparErroDe("termos");
                    }}
                    aria-invalid={errosCampo.termos ? true : undefined}
                    aria-describedby={errosCampo.termos ? "erro-termos" : undefined}
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
                {errosCampo.termos && (
                  <p className={styles.erroCampo} id="erro-termos">
                    {errosCampo.termos}
                  </p>
                )}
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
                      <p className="hint">É por aqui que o cliente fala com você.</p>
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
                      <p className="hint">Você vai receber um código de confirmação nesse endereço.</p>
                    )}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="dataNascimento">Data de nascimento</label>
                  <input
                    type="date"
                    id="dataNascimento"
                    value={dataNascimento}
                    max={dataMaximaNascimento()}
                    onChange={(e) => {
                      setDataNascimento(e.target.value);
                      limparErroDe("dataNascimento");
                    }}
                    className={errosCampo.dataNascimento ? styles.campoInvalido : undefined}
                    aria-invalid={errosCampo.dataNascimento ? true : undefined}
                    aria-describedby={errosCampo.dataNascimento ? "erro-data-nascimento" : undefined}
                    required
                  />
                  {errosCampo.dataNascimento && (
                    <p className={styles.erroCampo} id="erro-data-nascimento">
                      {errosCampo.dataNascimento}
                    </p>
                  )}
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
                    <p className="hint">Ajuda na verificação do seu perfil — pode preencher depois.</p>
                  </div>
                </div>
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
                  disabled={verificandoDuplicidade}
                >
                  {verificandoDuplicidade ? "Verificando…" : "Continuar →"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={status === "loading" || !aceitouTermos}
                >
                  {status === "loading" ? "Enviando…" : "Criar cadastro de corretor"}
                </button>
              )}
            </div>
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
                    Corretor(a){creci ? " · " + creci : ""}
                  </div>
                  <div className="stars mt-8" aria-label="sem avaliações ainda">
                    ★★★★★{" "}
                    <span className="muted mono" style={{ marginLeft: 4 }}>
                      novo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </>
  );
}
