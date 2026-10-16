"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConvidarCorretorForm() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "enviando" | "erro" | "feito">("idle");
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
    setMensagem(null);
    try {
      const resp = await fetch("/api/equipe/convidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        setMensagem(dados.erro ?? "Não foi possível enviar o convite.");
        setStatus("erro");
        return;
      }
      setMensagem(
        dados.email_enviado
          ? `Convite enviado para ${email}.`
          : "Convite criado, mas o e-mail não pôde ser enviado agora.",
      );
      setStatus("feito");
      setEmail("");
      router.refresh();
    } catch {
      setMensagem("Não foi possível enviar o convite agora. Tente de novo.");
      setStatus("erro");
    }
  }

  if (!aberto) {
    return (
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setAberto(true)}>
        + Convidar corretor
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-8 items-center" style={{ flexWrap: "wrap" }}>
      <input
        type="email"
        required
        placeholder="e-mail do corretor"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ minWidth: 220, margin: 0 }}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={status === "enviando"}>
        {status === "enviando" ? "Enviando…" : "Enviar convite"}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          setAberto(false);
          setMensagem(null);
          setStatus("idle");
        }}
      >
        Cancelar
      </button>
      {mensagem && (
        <p
          className="hint"
          style={{ width: "100%", margin: 0, color: status === "erro" ? "var(--coral)" : undefined }}
        >
          {mensagem}
        </p>
      )}
    </form>
  );
}
