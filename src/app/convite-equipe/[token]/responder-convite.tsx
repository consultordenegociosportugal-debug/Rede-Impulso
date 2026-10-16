"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResponderConvite({
  token,
  emailConvite,
  emailUsuario,
}: {
  token: string;
  emailConvite: string;
  emailUsuario: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "enviando" | "erro" | "feito">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);

  const emailDiferente = emailUsuario.toLowerCase() !== emailConvite.toLowerCase();

  async function responder(aceitar: boolean) {
    setStatus("enviando");
    setErro(null);
    try {
      const resp = await fetch("/api/equipe/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, aceitar }),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        setErro(dados.erro ?? "Não foi possível responder o convite.");
        setStatus("erro");
        return;
      }
      setAceito(aceitar);
      setStatus("feito");
    } catch {
      setErro("Não foi possível responder agora. Tente de novo.");
      setStatus("erro");
    }
  }

  if (status === "feito") {
    return (
      <div className="mt-24">
        <p className="muted" style={{ margin: 0 }}>
          {aceito
            ? "Convite aceito! Você já faz parte da equipe."
            : "Convite recusado."}
        </p>
        {aceito && (
          <button
            type="button"
            className="btn btn-primary btn-block mt-16"
            onClick={() => router.push("/painel-negocios")}
          >
            Ir para meu painel →
          </button>
        )}
      </div>
    );
  }

  if (emailDiferente) {
    return (
      <p className="hint mt-24" style={{ color: "var(--coral)" }}>
        Esse convite é para {emailConvite}, mas você entrou como {emailUsuario}. Saia e entre
        com a conta certa para responder.
      </p>
    );
  }

  return (
    <div className="mt-24">
      <div className="flex gap-8">
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => responder(true)}
          disabled={status === "enviando"}
        >
          {status === "enviando" ? "Respondendo…" : "Aceitar"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          style={{ flex: 1 }}
          onClick={() => responder(false)}
          disabled={status === "enviando"}
        >
          Recusar
        </button>
      </div>
      {erro && (
        <p className="hint mt-16" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
