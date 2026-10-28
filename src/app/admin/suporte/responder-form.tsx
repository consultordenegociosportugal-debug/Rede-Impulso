"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResponderForm({
  ticketId,
  respostaAtual,
}: {
  ticketId: string;
  respostaAtual: string;
}) {
  const router = useRouter();
  const [resposta, setResposta] = useState(respostaAtual);
  const [enviando, setEnviando] = useState<"responder" | "fechar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function responder() {
    if (!resposta.trim()) {
      setErro("Escreva uma resposta antes de enviar.");
      return;
    }
    setErro(null);
    setEnviando("responder");

    const supabase = createClient();
    const { error } = await supabase
      .from("tickets_suporte")
      .update({ resposta: resposta.trim(), status: "respondido", respondido_em: new Date().toISOString() })
      .eq("id", ticketId);

    if (error) {
      setErro(error.message);
      setEnviando(null);
      return;
    }

    // E-mail pro usuário é best-effort — a resposta já está salva mesmo
    // que esse envio falhe.
    fetch("/api/admin/suporte/notificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    }).catch(() => {});

    setEnviando(null);
    router.refresh();
  }

  async function fechar() {
    setErro(null);
    setEnviando("fechar");

    const supabase = createClient();
    const { error } = await supabase
      .from("tickets_suporte")
      .update({ status: "fechado" })
      .eq("id", ticketId);

    setEnviando(null);
    if (error) {
      setErro(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-12">
      <textarea
        rows={3}
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
        placeholder="Escreva sua resposta — ela vai por e-mail pra quem abriu o chamado."
      />
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      <div className="flex gap-8 mt-8">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={responder}
          disabled={enviando !== null}
        >
          {enviando === "responder" ? "Enviando…" : "Responder por e-mail"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={fechar}
          disabled={enviando !== null}
        >
          {enviando === "fechar" ? "Fechando…" : "Fechar sem responder"}
        </button>
      </div>
    </div>
  );
}
