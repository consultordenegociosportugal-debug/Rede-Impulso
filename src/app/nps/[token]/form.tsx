"use client";

import { useState } from "react";

type Status = "preenchendo" | "enviando" | "enviado" | "erro";

export function NpsForm({ token }: { token: string }) {
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [status, setStatus] = useState<Status>("preenchendo");

  async function enviar() {
    if (nota === null) return;
    setStatus("enviando");

    try {
      const resposta = await fetch("/api/nps/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nota, comentario: comentario.trim() || undefined }),
      });
      setStatus(resposta.ok ? "enviado" : "erro");
    } catch {
      setStatus("erro");
    }
  }

  if (status === "enviado") {
    return (
      <p className="muted" style={{ margin: 0 }}>
        Obrigado pela avaliação! Isso nos ajuda a melhorar o atendimento.
      </p>
    );
  }

  return (
    <div>
      <div
        className="flex gap-8"
        style={{ justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}
      >
        {Array.from({ length: 11 }, (_, n) => n).map((n) => (
          <button
            key={n}
            type="button"
            className={nota === n ? "badge badge-primary" : "badge badge-outline"}
            style={{ cursor: "pointer", border: "none", minWidth: 32 }}
            onClick={() => setNota(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 0 }}>
        0 = não indicaria · 10 = com certeza indicaria
      </p>

      <textarea
        rows={3}
        placeholder="Quer deixar um comentário? (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        style={{ width: "100%" }}
      />

      {status === "erro" && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          Não foi possível enviar. Tente de novo.
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block mt-12"
        onClick={enviar}
        disabled={nota === null || status === "enviando"}
      >
        {status === "enviando" ? "Enviando…" : "Enviar avaliação"}
      </button>
    </div>
  );
}
