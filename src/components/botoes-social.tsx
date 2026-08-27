"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./botoes-social.module.css";

type Provedor = "google" | "facebook";

const PROVEDORES: { valor: Provedor; nome: string }[] = [
  { valor: "google", nome: "Google" },
  { valor: "facebook", nome: "Facebook" },
];

/** Mensagens do Supabase chegam em inglês — aqui viram texto acionável em pt-BR. */
function traduzErroOAuth(mensagem: string, nome: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return `O login com ${nome} ainda não está liberado nesta conta. Use e-mail e senha por enquanto.`;
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.";
  return mensagem;
}

function IconeGoogle() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" className={styles.icone}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function IconeFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className={styles.icone}>
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

export function BotoesSocial({
  rotulo = "ou continue com",
  depois,
  papel,
  bloqueado = false,
  avisoBloqueado,
}: {
  /** Texto do divisor acima dos botões. */
  rotulo?: string;
  /** Caminho interno para onde voltar depois de autenticar. */
  depois?: string | null;
  /** Papel escolhido na página de origem — pré-seleciona /completar-cadastro. */
  papel?: string | null;
  /** Trava os botões (usado para exigir o aceite dos termos antes). */
  bloqueado?: boolean;
  avisoBloqueado?: string;
}) {
  const [carregando, setCarregando] = useState<Provedor | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function entrarCom(provider: Provedor, nome: string) {
    setCarregando(provider);
    setErro(null);

    const callback = new URL("/auth/callback", window.location.origin);
    if (depois && depois.startsWith("/") && !depois.startsWith("//")) {
      callback.searchParams.set("depois", depois);
    }
    if (papel) callback.searchParams.set("papel", papel);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });

    // Sem erro, o navegador já está saindo para o provedor — deixamos o
    // botão em "Abrindo…" até a navegação acontecer.
    if (error) {
      setErro(traduzErroOAuth(error.message, nome));
      setCarregando(null);
    }
  }

  return (
    <div>
      <div className={styles.divisor} aria-hidden="true">
        {rotulo}
      </div>
      <div className={styles.botoes}>
        {PROVEDORES.map(({ valor, nome }) => (
          <button
            key={valor}
            type="button"
            className={`btn btn-ghost btn-block ${styles.provedor}`}
            onClick={() => entrarCom(valor, nome)}
            disabled={bloqueado || carregando !== null}
          >
            {valor === "google" ? <IconeGoogle /> : <IconeFacebook />}
            {carregando === valor ? "Abrindo…" : `Continuar com ${nome}`}
          </button>
        ))}
      </div>

      {bloqueado && avisoBloqueado && <p className={styles.aviso}>{avisoBloqueado}</p>}
      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
