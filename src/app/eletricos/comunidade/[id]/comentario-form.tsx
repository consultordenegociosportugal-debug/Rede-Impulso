"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ComentarioForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/entrar?depois=/eletricos/comunidade/${postId}`);
      return;
    }

    const { error } = await supabase.from("ev_comentarios").insert({
      post_id: postId,
      autor_id: user.id,
      texto,
    });

    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setTexto("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-16">
      <div className="field">
        <label htmlFor="comentario">Comentar</label>
        <textarea
          id="comentario"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Escreva um comentário…"
          required
        />
      </div>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
        {enviando ? "Enviando…" : "Comentar"}
      </button>
    </form>
  );
}
