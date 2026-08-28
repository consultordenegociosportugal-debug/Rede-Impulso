"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatarTelefone,
  formatarCnpj,
  formatarCreci,
  formatarInstagram,
} from "@/lib/mascaras";
import styles from "./page.module.css";

type Campo = "nome" | "telefone" | "creci" | "bairros" | "cnpj" | "nomeFantasia" | "registro";
type ErrosCampo = Partial<Record<Campo, string>>;

const TELEFONE_OK = /^\(\d{2}\)\s?9\s?\d{4}-?\d{4}$/;
const CNPJ_OK = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const ROLE_LABEL: Record<string, string> = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  corretor: "Corretor",
  imobiliaria: "Imobiliária",
  cartorio: "Cartório",
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
  fotoUrlAtual,
  role,
  dadosCorretor,
  dadosImobiliaria,
  dadosCartorio,
}: {
  userId: string;
  emailAtual: string;
  nomeAtual: string;
  telefoneAtual: string;
  redeSocialAtual: string;
  fotoUrlAtual: string | null;
  role: string;
  dadosCorretor: { creci: string; bairros_atuacao: string[] } | null;
  dadosImobiliaria: { cnpj: string; nome_fantasia: string } | null;
  dadosCartorio: { registro_serventia: string } | null;
}) {
  const router = useRouter();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(nomeAtual);
  const [telefone, setTelefone] = useState(formatarTelefone(telefoneAtual));
  const [redeSocial, setRedeSocial] = useState(redeSocialAtual);
  const [fotoUrl, setFotoUrl] = useState(fotoUrlAtual);
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const [creci, setCreci] = useState(dadosCorretor?.creci ?? "");
  const [bairros, setBairros] = useState((dadosCorretor?.bairros_atuacao ?? []).join(", "));
  const [cnpj, setCnpj] = useState(dadosImobiliaria?.cnpj ?? "");
  const [nomeFantasia, setNomeFantasia] = useState(dadosImobiliaria?.nome_fantasia ?? "");
  const [registro, setRegistro] = useState(dadosCartorio?.registro_serventia ?? "");

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
      if (!creci.trim()) problemas.creci = "Informe o número do seu CRECI.";
      else if (!/\d{3}/.test(creci)) problemas.creci = "CRECI incompleto — ex: 7027-MA.";
      if (!bairros.trim()) problemas.bairros = "Informe ao menos um bairro onde você atua.";
    }
    if (role === "imobiliaria") {
      if (!cnpj.trim()) problemas.cnpj = "Informe o CNPJ da imobiliária.";
      else if (!CNPJ_OK.test(cnpj)) problemas.cnpj = "CNPJ incompleto — são 14 dígitos.";
      if (!nomeFantasia.trim()) problemas.nomeFantasia = "Informe o nome fantasia.";
    }
    if (role === "cartorio" && !registro.trim()) {
      problemas.registro = "Informe o registro da serventia.";
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
          creci,
          bairros_atuacao: bairros
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean),
        })
        .eq("profile_id", userId);
      if (erroCorretor) {
        setErro(erroCorretor.message);
        setStatus("error");
        return;
      }
    } else if (role === "imobiliaria") {
      const { error: erroImobiliaria } = await supabase
        .from("imobiliaria_perfis")
        .update({ cnpj, nome_fantasia: nomeFantasia })
        .eq("profile_id", userId);
      if (erroImobiliaria) {
        setErro(erroImobiliaria.message);
        setStatus("error");
        return;
      }
    } else if (role === "cartorio") {
      const { error: erroCartorio } = await supabase
        .from("cartorio_perfis")
        .update({ registro_serventia: registro })
        .eq("profile_id", userId);
      if (erroCartorio) {
        setErro(erroCartorio.message);
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
              <p className="hint">Separe por vírgula.</p>
            )}
          </div>
        </div>
      )}

      {role === "imobiliaria" && (
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
            {errosCampo.cnpj && (
              <p className={styles.erroCampo} id="erro-cnpj">
                {errosCampo.cnpj}
              </p>
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

      {role === "cartorio" && (
        <div className="field">
          <label htmlFor="registro">Registro da serventia</label>
          <input
            type="text"
            id="registro"
            value={registro}
            onChange={(e) => {
              setRegistro(e.target.value);
              limparErroDe("registro");
            }}
            className={errosCampo.registro ? styles.campoInvalido : undefined}
            aria-invalid={errosCampo.registro ? true : undefined}
            aria-describedby={errosCampo.registro ? "erro-registro" : undefined}
            required
          />
          {errosCampo.registro && (
            <p className={styles.erroCampo} id="erro-registro">
              {errosCampo.registro}
            </p>
          )}
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
