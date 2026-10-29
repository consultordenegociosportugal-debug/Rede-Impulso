"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarTelefone, formatarCreci, formatarInstagram, formatarCpf } from "@/lib/mascaras";
import { cpfValido } from "@/lib/validacoes";
import { BairrosInput } from "@/components/bairros-input";
import { CidadeInput } from "@/components/cidade-input";
import styles from "./page.module.css";

type Campo = "nome" | "telefone" | "cpf" | "creci" | "bairros";
type ErrosCampo = Partial<Record<Campo, string>>;

const TELEFONE_OK = /^\(\d{2}\)\s?9\s?\d{4}-?\d{4}$/;

// Mesmo motivo do completar-cadastro: nome e CRECI não têm regra nativa
// (pattern/required) pras checagens de "sobrenome" e "3 dígitos", então
// sem isso "Salvar alterações" parecia não fazer nada.
const CAMPO_ID: Record<Campo, string> = {
  nome: "nome",
  telefone: "tel",
  cpf: "cpf",
  creci: "creci",
  bairros: "bairro",
};

const ROLE_LABEL: Record<string, string> = {
  comprador: "Cliente",
  corretor: "Corretor",
  gestor: "Gestor",
};

function iniciais(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "??"
  );
}

export function EditarPerfilForm({
  userId,
  emailAtual,
  nomeAtual,
  telefoneAtual,
  redeSocialAtual,
  facebookAtual,
  fotoUrlAtual,
  role,
  dadosCorretor,
}: {
  userId: string;
  emailAtual: string;
  nomeAtual: string;
  telefoneAtual: string;
  redeSocialAtual: string;
  facebookAtual: string;
  fotoUrlAtual: string | null;
  role: string;
  dadosCorretor: {
    cpf: string | null;
    creci: string;
    bairros_atuacao: string[];
    cidade: string | null;
  } | null;
}) {
  const router = useRouter();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(nomeAtual);
  const [telefone, setTelefone] = useState(formatarTelefone(telefoneAtual));
  const [redeSocial, setRedeSocial] = useState(redeSocialAtual);
  const [facebook, setFacebook] = useState(facebookAtual);
  const [fotoUrl, setFotoUrl] = useState(fotoUrlAtual);
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const [cpf, setCpf] = useState(formatarCpf(dadosCorretor?.cpf ?? ""));
  const [creci, setCreci] = useState(dadosCorretor?.creci ?? "");
  const [bairros, setBairros] = useState<string[]>(dadosCorretor?.bairros_atuacao ?? []);
  const [cidade, setCidade] = useState(dadosCorretor?.cidade ?? "");

  const [status, setStatus] = useState<"idle" | "loading" | "sucesso" | "error">("idle");
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

  function selecionarFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setFotoArquivo(arquivo);
    setFotoPreview(URL.createObjectURL(arquivo));
  }

  function validar(): ErrosCampo {
    const problemas: ErrosCampo = {};
    if (!nome.trim()) problemas.nome = "Digite seu nome completo.";
    else if (!nome.trim().includes(" ")) problemas.nome = "Informe nome e sobrenome.";

    if (!telefone) problemas.telefone = "Informe seu WhatsApp com DDD.";
    else if (!TELEFONE_OK.test(telefone))
      problemas.telefone = "Número incompleto — ex: (98) 9 9999-9999.";

    if (role === "corretor") {
      if (!cpf.trim()) problemas.cpf = "Informe seu CPF.";
      else if (!cpfValido(cpf)) problemas.cpf = "Esse CPF não é válido — confira os números.";
      if (!creci.trim()) problemas.creci = "Informe o número do seu CRECI.";
      else if (!/\d{3}/.test(creci)) problemas.creci = "CRECI incompleto — ex: 7027-MA.";
      if (bairros.length === 0) problemas.bairros = "Informe ao menos um bairro onde você atua.";
    }
    return problemas;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const problemas = validar();
    if (Object.keys(problemas).length > 0) {
      setErrosCampo(problemas);
      setErro("Confira os campos destacados abaixo antes de salvar.");
      const campoComErro = Object.keys(problemas)[0] as Campo;
      const elementoId = CAMPO_ID[campoComErro];
      requestAnimationFrame(() => {
        const el = document.getElementById(elementoId);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
      });
      return;
    }

    setStatus("loading");
    setErro(null);

    const supabase = createClient();
    let novaFotoUrl = fotoUrl;

    if (fotoArquivo) {
      const extensao = fotoArquivo.name.split(".").pop() ?? "jpg";
      const caminho = `${userId}/avatar.${extensao}`;
      const { error: uploadError } = await supabase.storage
        .from("perfil-fotos")
        .upload(caminho, fotoArquivo, { upsert: true });

      if (uploadError) {
        setErro(uploadError.message);
        setStatus("error");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("perfil-fotos").getPublicUrl(caminho);
      novaFotoUrl = `${publicUrl}?v=${Date.now()}`;
    }

    const { error: erroPerfil } = await supabase
      .from("profiles")
      .update({
        nome: nome.trim(),
        telefone,
        rede_social: redeSocial.trim() || null,
        facebook: facebook.trim() || null,
        foto_url: novaFotoUrl,
      })
      .eq("id", userId);

    if (erroPerfil) {
      setErro(erroPerfil.message);
      setStatus("error");
      return;
    }

    if (role === "corretor") {
      const { error: erroCorretor } = await supabase
        .from("corretor_perfis")
        .update({
          cpf: cpf.replace(/\D/g, ""),
          creci,
          bairros_atuacao: bairros,
          cidade: cidade || null,
        })
        .eq("profile_id", userId);
      if (erroCorretor) {
        setErro(erroCorretor.message);
        setStatus("error");
        return;
      }
    }

    setFotoUrl(novaFotoUrl);
    setFotoArquivo(null);
    setStatus("sucesso");
    router.refresh();
  }

  return (
    <form className="card mt-24" onSubmit={handleSubmit}>
      <div className={styles.resumo}>
        <span aria-hidden="true">👤</span>
        <span>
          Conectado como <strong>{emailAtual}</strong> · {ROLE_LABEL[role] ?? role}
        </span>
      </div>

      <div className={styles.fotoLinha}>
        <div
          className="avatar lg"
          style={
            fotoPreview || fotoUrl
              ? {
                  backgroundImage: `url(${fotoPreview ?? fotoUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {!fotoPreview && !fotoUrl ? iniciais(nome || "??") : null}
        </div>
        <div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => inputFotoRef.current?.click()}
          >
            Trocar foto
          </button>
          <p className="hint" style={{ margin: "6px 0 0" }}>
            Aparece no seu perfil público e nos seus anúncios.
          </p>
        </div>
        <input
          ref={inputFotoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => selecionarFoto(e.target.files?.[0])}
        />
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
        {errosCampo.nome && (
          <p className={styles.erroCampo} id="erro-nome">
            {errosCampo.nome}
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
          <p className="hint">Não aparece no anúncio — só quem negocia com você recebe.</p>
        )}
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="rede">Instagram (opcional)</label>
          <input
            type="text"
            id="rede"
            placeholder="@seuusuario"
            value={redeSocial}
            onChange={(e) => setRedeSocial(formatarInstagram(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="facebook">Facebook (opcional)</label>
          <input
            type="text"
            id="facebook"
            placeholder="facebook.com/suapagina"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
          />
        </div>
      </div>
      {(redeSocial || facebook) && (
        <p className="hint" style={{ marginTop: -8 }}>
          Aparecem no seu perfil público — ajuda quem está te conhecendo a confirmar que é você mesmo.
        </p>
      )}

      {role === "corretor" && (
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
      )}

      {role === "corretor" && (
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
            {errosCampo.creci && (
              <p className={styles.erroCampo} id="erro-creci">
                {errosCampo.creci}
              </p>
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
              <p className="hint">Digite e aperte Enter.</p>
            )}
          </div>
        </div>
      )}

      {role === "corretor" && (
        <div className="field">
          <label htmlFor="cidadeAtuacao">
            Cidade de atuação{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              (opcional)
            </span>
          </label>
          <CidadeInput id="cidadeAtuacao" value={cidade} onChange={setCidade} />
          <p className="hint">Ajuda quem está procurando um profissional perto de onde mora.</p>
        </div>
      )}

      {status === "sucesso" && (
        <div className={styles.sucessoBloco} role="status">
          <span aria-hidden="true">✓</span>
          <span>Perfil atualizado.</span>
        </div>
      )}

      {erro && (
        <div className={styles.erroBloco} role="alert">
          <span>{erro}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-block mt-16"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
