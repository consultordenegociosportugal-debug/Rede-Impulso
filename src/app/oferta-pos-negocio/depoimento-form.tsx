"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MelhorarTexto } from "@/components/melhorar-texto";

export function DepoimentoForm({
  negocioId,
  corretorId,
}: {
  negocioId: string;
  corretorId: string | null;
}) {
  const [texto, setTexto] = useState("");
  const [estrelas, setEstrelas] = useState(5);
  const [status, setStatus] = useState<
    "idle" | "enviando" | "enviado" | "erro"
  >("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Você precisa estar logado.");
      setStatus("erro");
      return;
    }

    const { error } = await supabase.from("depoimentos").insert({
      negocio_id: negocioId,
      autor_id: user.id,
      corretor_id: corretorId,
      texto,
      estrelas,
    });

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    setStatus("enviado");
  }

  if (status === "enviado") {
    return (
      <div className="card mt-24" style={{ textAlign: "center" }}>
        <p className="muted" style={{ margin: 0 }}>
          Obrigado! Seu depoimento já está no mural de conquistas.
        </p>
      </div>
    );
  }

  return (
    <form className="card mt-24" onSubmit={handleSubmit}>
      <span className="eyebrow">Deixe seu depoimento</span>
      <div className="field mt-12">
        <label>Nota</label>
        <div className="flex gap-8">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEstrelas(n)}
              className="btn btn-ghost btn-sm"
              style={{ color: n <= estrelas ? "var(--amber)" : "var(--ink-soft)" }}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="depoimento-texto">Como foi a experiência?</label>
        <textarea
          id="depoimento-texto"
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          required
        />
        <MelhorarTexto texto={texto} onAplicar={setTexto} />
      </div>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={status === "enviando"}
      >
        {status === "enviando" ? "Enviando…" : "Publicar depoimento"}
      </button>
    </form>
  );
}
