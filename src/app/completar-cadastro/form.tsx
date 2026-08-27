"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { destinoPosLogin } from "@/lib/destino-pos-login";
import {
  formatarTelefone,
  formatarCnpj,
  formatarCreci,
} from "@/lib/mascaras";
import styles from "./page.module.css";

type Papel = "comprador" | "vendedor" | "corretor" | "imobiliaria";
type Campo = "nome" | "telefone" | "creci" | "bairros" | "cnpj" | "nomeFantasia";
type ErrosCampo = Partial<Record<Campo, string>>;

const TELEFONE_OK = /^\(\d{2}\)\s?9\s?\d{4}-?\d{4}$/;
const CNPJ_OK = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

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

const PAPEIS_VALIDOS = PAPEIS.map((p) => p.valor) as string[];

function papelInicial(sugerido: string | null, atual: string): Papel {
  if (sugerido && PAPEIS_VALIDOS.includes(sugerido)) return sugerido as Papel;
  if (PAPEIS_VALIDOS.includes(atual)) return atual as Papel;
  return "comprador";
}

export function CompletarCadastroForm({
  nomeAtual,
  emailAtual,
  roleAtual,
  papelSugerido,
  depois,
}: {
  nomeAtual: string;
  emailAtual: string;
  roleAtual: string;
  papelSugerido: string | null;
  depois: string | null;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeAtual);
  const [telefone, setTelefone] = useState("");
  const [papel, setPapel] = useState<Papel>(papelInicial(papelSugerido, roleAtual));
  const [creci, setCreci] = useState("");
  const [bairros, setBairros] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<ErrosCampo>({});

  function limparErroDe(campo: Campo) {
    setErrosCampo((atuais) => {
      if (!atuais[campo]) return atuais;
      const proximos = { ...atuais };
      delete proximos[campo];
      return proximos;
    });
  }

  function validar(): ErrosCampo {
    const problemas: ErrosCampo = {};
    if (!nome.trim()) problemas.nome = "Digite seu nome completo.";
    else if (!nome.trim().includes(" ")) problemas.nome = "Informe nome e sobrenome.";

    if (!telefone) problemas.telefone = "Informe seu WhatsApp com DDD.";
    else if (!TELEFONE_OK.test(telefone))
      problemas.telefone = "Número incompleto — ex: (98) 9 9999-9999.";

    if (papel === "corretor") {
      if (!creci.trim()) problemas.creci = "Informe o número do seu CRECI.";
      else if (!/\d{3}/.test(creci)) problemas.creci = "CRECI incompleto — ex: 7027-MA.";
      if (!bairros.trim()) problemas.bairros = "Informe ao menos um bairro onde você atua.";
    }
    if (papel === "imobiliaria") {
      if (!cnpj.trim()) problemas.cnpj = "Informe o CNPJ da imobiliária.";
      else if (!CNPJ_OK.test(cnpj)) problemas.cnpj = "CNPJ incompleto — são 14 dígitos.";
      if (!nomeFantasia.trim()) problemas.nomeFantasia = "Informe o nome fantasia.";
    }
    return problemas;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const problemas = validar();
    if (Object.keys(problemas).length > 0) {
      setErrosCampo(problemas);
      return;
    }

    setStatus("loading");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sua sessão expirou. Entre de novo para continuar.");
      setStatus("error");
      return;
    }

    const { error: erroPerfil } = await supabase
      .from("profiles")
      .update({
        nome: nome.trim(),
        telefone,
        role: papel,
        termos_aceitos_em: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (erroPerfil) {
      setErro(erroPerfil.message);
      setStatus("error");
      return;
    }

    // A extensão de papel não existe ainda: o trigger só cria quando o
    // `role` já vem no metadata, e no login social ele nunca vem.
    if (papel === "corretor") {
      const { error: erroCorretor } = await supabase.from("corretor_perfis").upsert(
        {
          profile_id: user.id,
          creci,
          bairros_atuacao: bairros
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean),
        },
        { onConflict: "profile_id" },
      );
      if (erroCorretor) {
        setErro(erroCorretor.message);
        setStatus("error");
        return;
      }
    } else if (papel === "imobiliaria") {
      const { error: erroImobiliaria } = await supabase
        .from("imobiliaria_perfis")
        .upsert(
          { profile_id: user.id, cnpj, nome_fantasia: nomeFantasia },
          { onConflict: "profile_id" },
        );
      if (erroImobiliaria) {
        setErro(erroImobiliaria.message);
        setStatus("error");
        return;
      }
    }

    const destino = await destinoPosLogin(supabase, user.id, { depois });
    router.push(destino);
    router.refresh();
  }

  const precisaDocumentos = papel !== "comprador";

  return (
    <form className="card mt-24" onSubmit={handleSubmit}>
      <div className={styles.resumo}>
        <span aria-hidden="true">👤</span>
        <span>
          Conectado como <strong>{emailAtual}</strong>
        </span>
      </div>

      <div className="field">
        <label htmlFor="nome">Nome completo</label>
        <input
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
          <p className="hint">
            Veio do seu login social — ajuste se não for como você quer aparecer.
          </p>
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
            É por aqui que a outra parte da negociação fala com você. Não aparece
            no anúncio.
          </p>
        )}
      </div>

      <div className="field">
        <label>Qual é o seu papel na Rede?</label>
        <div
          className={`${styles.escolhaGrid} mb-16`}
          role="radiogroup"
          aria-label="Qual é o seu papel na Rede?"
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
      </div>

      {papel === "corretor" && (
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
      )}

      {papel === "imobiliaria" && (
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

      <div className={`${styles.notice} mb-16`}>
        <span aria-hidden="true">ℹ️</span>
        {precisaDocumentos ? (
          <span>
            No próximo passo você envia os documentos de verificação — é o que
            libera{" "}
            {papel === "vendedor"
              ? "a publicação dos seus imóveis"
              : "o seu perfil público"}
            .
          </span>
        ) : (
          <span>
            <strong>Como comprador</strong>, você não precisa enviar documento de
            identidade agora — só quando iniciar uma negociação por um imóvel
            específico.
          </span>
        )}
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

      {erro && (
        <div className={styles.erroBloco} role="alert">
          <span>{erro}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-block mt-16"
        disabled={status === "loading" || !aceitouTermos}
      >
        {status === "loading" ? "Salvando…" : "Concluir cadastro"}
      </button>
    </form>
  );
}
